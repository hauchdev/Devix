import { gradleJavaBlocks } from "./gradle-common.js";
import {
  versionsFor,
  type PlatformRenderer,
  type TemplateContext,
  type TemplateFile,
} from "./types.js";
import { renderFabric } from "./fabric.js";
import { renderForge } from "./forge.js";
import { renderNeoForge } from "./neoforge.js";

const LOADER_MODULE: Readonly<Record<string, string>> = {
  fabric: "fabric",
  forge: "forge",
  neoforge: "neoforge",
};

/** settings.gradle of a combined multi-loader build. */
function multiloaderSettings(context: TemplateContext, loaders: readonly string[]): string {
  return [
    "pluginManagement {",
    "    repositories {",
    "        maven { name = 'Fabric'; url = 'https://maven.fabricmc.net/' }",
    "        maven { url = 'https://maven.minecraftforge.net/' }",
    "        maven { url = 'https://maven.neoforged.net/releases' }",
    "        mavenCentral()",
    "        gradlePluginPortal()",
    "    }",
    "}",
    "",
    ...loaders.map((loader) => `include '${LOADER_MODULE[loader] ?? loader}'`),
    "",
    `rootProject.name = '${context.name}'`,
    "",
  ].join("\n");
}

/** Shared root build.gradle of a combined multi-loader build. */
function rootBuild(context: TemplateContext, loaders: readonly string[]): string {
  const java = context.versions[0]?.javaVersion ?? 21;
  return [
    "plugins {",
    "    id 'java'",
    "    id 'maven-publish'",
    "}",
    "",
    "allprojects {",
    `    version = '${context.version}'`,
    `    group = '${context.packageName}'`,
    "}",
    "",
    "subprojects {",
    "    apply plugin: 'java-library'",
    ...gradleJavaBlocks(java).map((lineValue) => `    ${lineValue}`),
    "}",
    "",
    "// Loader modules: " + loaders.join(", "),
    "",
  ].join("\n");
}

/** Shared gradle.properties of a combined multi-loader build. */
function sharedProperties(context: TemplateContext, loaders: readonly string[]): string {
  const lines = ["org.gradle.jvmargs=-Xmx2G", "org.gradle.parallel=true", ""];
  lines.push("# Shared version catalog (managed by devix minecraft init --mc)");
  const seen = new Set<string>();
  for (const loader of loaders) {
    const resolved = versionsFor(context, loader);
    if (resolved === undefined) continue;
    for (const [key, value] of Object.entries(resolved.deps)) {
      if (!seen.has(key)) {
        seen.add(key);
        lines.push(`${key}=${value}`);
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * The common mod sources: shared by every loader module through a
 * `common`-style source dir copied at generation time.
 */
function commonSources(context: TemplateContext): TemplateFile[] {
  const mainClass = pascalName(context.name);
  const pkg = context.packageName.split(".").join("/");
  const leaf = context.packageName.split(".").pop() ?? "project";
  return [
    {
      path: `common/src/main/java/${pkg}/${mainClass}.java`,
      contents: [
        `package ${context.packageName};`,
        "",
        "/**",
        ` * Platform-agnostic entry point of the ${context.name} mod.`,
        " */",
        `public class ${mainClass} {`,
        `    public static final String MOD_ID = "${leaf}";`,
        "",
        "    public static void init() {",
        `        System.out.println("[${context.name}] init");`,
        "    }",
        "}",
        "",
      ].join("\n"),
    },
  ];
}

function pascalName(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Per-loader module: a subproject whose build applies the loader's
 * plugin and delegates its entrypoint to the common code.
 */
function loaderModules(context: TemplateContext, loaders: readonly string[]): TemplateFile[] {
  const files: TemplateFile[] = [];
  const mainClass = pascalName(context.name);
  const pkg = context.packageName.split(".").join("/");
  const leaf = context.packageName.split(".").pop() ?? "project";

  for (const loader of loaders) {
    const dir = LOADER_MODULE[loader] ?? loader;
    const resolved = versionsFor(context, loader);
    const java = resolved?.javaVersion ?? 21;

    if (loader === "fabric") {
      files.push({
        path: `${dir}/build.gradle`,
        contents: [
          "plugins {",
          `    id 'fabric-loom' version '${resolved?.loom ?? "1.9-SNAPSHOT"}'`,
          "}",
          "",
          "dependencies {",
          '    minecraft "com.mojang:minecraft:${project.minecraft_version}"',
          '    mappings "net.fabricmc:yarn:${project.yarn_mappings}:v2"',
          '    modImplementation "net.fabricmc:fabric-loader:${project.fabric_loader}"',
          '    modImplementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_api}"',
          "    include project(':common')",
          "}",
          "",
          "processResources {",
          "    inputs.property 'version', project.version",
          "    filesMatching('fabric.mod.json') {",
          "        expand version: project.version",
          "    }",
          "}",
          "",
        ].join("\n"),
      });
      files.push({
        path: `${dir}/src/main/resources/fabric.mod.json`,
        contents: `${JSON.stringify(
          {
            schemaVersion: 1,
            id: leaf,
            version: context.version,
            name: context.name,
            environment: "*",
            entrypoints: { main: [`${context.packageName}.fabric.${mainClass}Fabric`] },
            depends: {
              fabricloader: `>=${resolved?.deps.fabric_loader ?? "0.16.0"}`,
              minecraft: `~${resolved?.minecraft ?? "1.21.1"}`,
              java: `>=${java}`,
            },
          },
          null,
          2,
        )}\n`,
      });
      files.push({
        path: `${dir}/src/main/java/${pkg}/fabric/${mainClass}Fabric.java`,
        contents: [
          `package ${context.packageName}.fabric;`,
          "",
          `import ${context.packageName}.${mainClass};`,
          "import net.fabricmc.api.ModInitializer;",
          "",
          "/** Fabric entrypoint delegating to the common initializer. */",
          `public class ${mainClass}Fabric implements ModInitializer {`,
          "    @Override",
          "    public void onInitialize() {",
          `        ${mainClass}.init();`,
          "    }",
          "}",
          "",
        ].join("\n"),
      });
      continue;
    }

    if (loader === "forge" || loader === "neoforge") {
      const isNeo = loader === "neoforge";
      files.push({
        path: `${dir}/build.gradle`,
        contents: isNeo
          ? [
              "plugins {",
              `    id 'net.neoforged.gradle.userdev' version '${resolved?.deps.neogradle_version ?? "7.0.171"}'`,
              "}",
              "",
              "dependencies {",
              '    implementation "net.neoforged:neoforge:${project.neoforge_version}"',
              "    implementation project(':common')",
              "}",
              "",
            ].join("\n")
          : [
              "plugins {",
              `    id 'net.minecraftforge.gradle' version '${resolved?.deps.forgegradle_version ?? "[6.0,6.2)"}'`,
              "}",
              "",
              "minecraft {",
              `    mappings channel: 'official', version: '${resolved?.deps.minecraft_version ?? "1.21.1"}'`,
              "}",
              "",
              "dependencies {",
              '    minecraft "net.minecraftforge:forge:${project.forge_version}"',
              "    implementation project(':common')",
              "}",
              "",
            ].join("\n"),
      });
      const manifestPath = isNeo
        ? `${dir}/src/main/resources/META-INF/neoforge.mods.toml`
        : `${dir}/src/main/resources/META-INF/mods.toml`;
      files.push({
        path: manifestPath,
        contents: isNeo
          ? [
              'modLoader="javafml"',
              'loaderVersion="[1,)"',
              'license="MIT"',
              "",
              "[[mods]]",
              `modId="${leaf}"`,
              `version="${context.version}"`,
              `displayName="${context.name}"`,
              "",
            ].join("\n")
          : [
              'modLoader="javafml"',
              `loaderVersion="${resolved?.deps.forge_loader_version ?? "[47,)"}"`,
              'license="MIT"',
              "",
              "[[mods]]",
              `modId="${leaf}"`,
              `version="${context.version}"`,
              `displayName="${context.name}"`,
              "",
            ].join("\n"),
      });
      const className = isNeo ? `${mainClass}NeoForge` : `${mainClass}Forge`;
      const subPackage = isNeo ? "neoforge" : "forge";
      const importLine = isNeo
        ? "import net.neoforged.fml.common.Mod;"
        : "import net.minecraftforge.fml.common.Mod;";
      files.push({
        path: `${dir}/src/main/java/${pkg}/${subPackage}/${className}.java`,
        contents: [
          `package ${context.packageName}.${subPackage};`,
          "",
          `import ${context.packageName}.${mainClass};`,
          importLine,
          "",
          "/** " +
            (isNeo ? "NeoForge" : "Forge") +
            " entrypoint delegating to the common initializer. */",
          `@Mod(${className}.MOD_ID)`,
          `public class ${className} {`,
          `    public static final String MOD_ID = "${leaf}";`,
          "",
          `    public ${className}() {`,
          `        ${mainClass}.init();`,
          "    }",
          "}",
          "",
        ].join("\n"),
      });
    }
  }
  return files;
}

/** Extra module builds reused from the single-loader path. */
function extraModuleFiles(context: TemplateContext): TemplateFile[] {
  // Delegate to the shared generator through the fabric renderer's
  // module builder: render a throwaway fabric context files list and
  // keep only the module build files.
  const moduleBuildsOnly = (files: readonly TemplateFile[]): TemplateFile[] =>
    files.filter(
      (file) =>
        (file.path.endsWith("/build.gradle") && file.path.includes("/")) ||
        file.path === "common/src/main/java-placeholder",
    );
  const platformIds = context.platforms.length > 0 ? context.platforms : ["fabric"];
  const base: string = platformIds[0] ?? "fabric";
  const renderer =
    base === "forge" ? renderForge : base === "neoforge" ? renderNeoForge : renderFabric;
  return moduleBuildsOnly(
    renderer({ ...context, platform: base, platforms: [base], multimodule: true }),
  );
}

/**
 * Multi-loader renderer: `fabric+forge`, `fabric+neoforge` or the
 * triple. One Gradle build, shared version catalog, a `common`
 * sourceset and one subproject per loader. Extra modules become
 * additional subprojects depending on `common`.
 */
export const renderMultiLoader: PlatformRenderer = (context) => {
  const loaders = context.platforms
    .map((platform) => LOADER_MODULE[platform])
    .filter((loader): loader is string => loader !== undefined);

  return [
    { path: "settings.gradle", contents: multiloaderSettings(context, loaders) },
    { path: "build.gradle", contents: rootBuild(context, loaders) },
    { path: "gradle.properties", contents: sharedProperties(context, loaders) },
    ...commonSources(context),
    ...loaderModules(context, loaders),
    ...extraModuleFiles(context),
  ];
};
