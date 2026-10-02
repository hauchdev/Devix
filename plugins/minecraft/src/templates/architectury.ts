import { moduleSrcMain } from "./gradle-common.js";
import {
  extraModules,
  packageLeaf,
  packagePath,
  pascalCase,
  type PlatformRenderer,
  type TemplateContext,
  type TemplateFile,
} from "./types.js";

/** Settings.gradle of the Architectury multi-project. */
function settings(context: TemplateContext, secondLoader: string): string {
  const includes = [
    "include 'common'",
    "include 'fabric'",
    `include '${secondLoader}'`,
    ...extraModules(context).map((module) => `include ':${module}'`),
  ];
  return [
    "pluginManagement {",
    "    repositories {",
    "        maven { url = 'https://maven.fabricmc.net/' }",
    "        maven { url = 'https://maven.minecraftforge.net/' }",
    "        maven { url = 'https://maven.neoforged.net/releases' }",
    "        maven { url = 'https://maven.architectury.dev/' }",
    "        mavenCentral()",
    "        gradlePluginPortal()",
    "    }",
    "}",
    "",
    ...includes,
    "",
    `rootProject.name = '${context.name}'`,
    "",
  ].join("\n");
}

/**
 * Architectury templates: a Gradle multi-project with `common`, the
 * Fabric loader subproject and a second loader subproject (Forge on
 * legacy Minecraft lines, NeoForge on modern ones), all driven by the
 * version catalog. Extra modules become subprojects that depend on
 * `common`.
 */
export const renderArchitectury: PlatformRenderer = (context) => {
  const deps = context.versions[0]?.deps ?? {};
  const mainClass = pascalCase(context.name);
  const pkg = packagePath(context.packageName);
  const leaf = packageLeaf(context.packageName);
  const secondLoader = deps.architectury_second_loader ?? "forge";
  const secondIsForge = secondLoader === "forge";
  const files: TemplateFile[] = [];

  files.push({ path: "settings.gradle", contents: settings(context, secondLoader) });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      `    id 'architectury-plugin' version '${deps.architectury_plugin ?? "3.4-SNAPSHOT"}'`,
      "    id 'dev.architectury.loom' version '" +
        (context.versions[0]?.loom ?? "1.9-SNAPSHOT") +
        "' apply false",
      "}",
      "",
      "architectury {",
      `    minecraft = '${deps.minecraft_version ?? "1.21.1"}'`,
      "}",
      "",
      "subprojects {",
      "    apply plugin: 'dev.architectury.loom'",
      `    java.toolchain.languageVersion = JavaLanguageVersion.of(${String(context.versions[0]?.javaVersion ?? 21)})`,
      `    group = '${context.packageName}'`,
      `    version = '${context.version}'`,
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "gradle.properties",
    contents: [
      "org.gradle.jvmargs=-Xmx2G",
      "",
      "# Version catalog (managed by devix minecraft init --mc)",
      ...Object.entries(deps).map(([key, value]) => `${key}=${value}`),
      "",
    ].join("\n"),
  });

  files.push({
    path: "common/build.gradle",
    contents: [
      "architectury {",
      `    common('fabric', '${secondLoader}')`,
      "}",
      "",
      "dependencies {",
      '    modImplementation "net.fabricmc:fabric-loader:${project.fabric_loader}"',
      '    api "dev.architectury:architectury-fabric:${project.architectury_api}"',
      ...extraModules(context).map((module) => `    api project(':${module}')`),
      "}",
      "",
    ].join("\n"),
  });

  files.push({
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
      `        System.out.println("[${context.name}] common init");`,
      "    }",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "fabric/build.gradle",
    contents: [
      "architectury {",
      "    fabric()",
      "}",
      "",
      "dependencies {",
      '    minecraft "com.mojang:minecraft:${project.minecraft_version}"',
      '    mappings "net.fabricmc:yarn:${project.yarn_mappings}:v2"',
      '    modImplementation "net.fabricmc:fabric-loader:${project.fabric_loader}"',
      '    modImplementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_api}"',
      '    modImplementation "dev.architectury:architectury-fabric:${project.architectury_api}"',
      "    modImplementation project(path: ':common', configuration: 'namedElements')",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "fabric/src/main/resources/fabric.mod.json",
    contents: `${JSON.stringify(
      {
        schemaVersion: 1,
        id: leaf,
        version: context.version,
        name: context.name,
        environment: "*",
        entrypoints: { main: [`${context.packageName}.fabric.${mainClass}Fabric`] },
        depends: {
          fabricloader: `>=${deps.fabric_loader ?? "0.16.0"}`,
          minecraft: `~${deps.minecraft_version ?? "1.21.1"}`,
          java: `>=${context.versions[0]?.javaVersion ?? 21}`,
        },
      },
      null,
      2,
    )}\n`,
  });

  files.push({
    path: `fabric/src/main/java/${pkg}/fabric/${mainClass}Fabric.java`,
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

  if (secondIsForge) {
    files.push({
      path: "forge/build.gradle",
      contents: [
        "architectury {",
        "    forge()",
        "}",
        "",
        "dependencies {",
        '    forge "net.minecraftforge:forge:${project.forge_version}"',
        '    implementation "dev.architectury:architectury-forge:${project.architectury_api}"',
        "    implementation project(path: ':common', configuration: 'namedElements')",
        "}",
        "",
      ].join("\n"),
    });
    files.push({
      path: "forge/src/main/resources/META-INF/mods.toml",
      contents: [
        'modLoader="javafml"',
        `loaderVersion="${deps.forge_loader_version ?? "[47,)"}"`,
        'license="MIT"',
        "",
        "[[mods]]",
        `modId="${leaf}"`,
        `version="${context.version}"`,
        `displayName="${context.name}"`,
        "",
      ].join("\n"),
    });
    files.push({
      path: `forge/src/main/java/${pkg}/forge/${mainClass}Forge.java`,
      contents: [
        `package ${context.packageName}.forge;`,
        "",
        `import ${context.packageName}.${mainClass};`,
        "import net.minecraftforge.fml.common.Mod;",
        "",
        "/** Forge entrypoint delegating to the common initializer. */",
        `@Mod(${mainClass}Forge.MOD_ID)`,
        `public class ${mainClass}Forge {`,
        `    public static final String MOD_ID = "${leaf}";`,
        "",
        `    public ${mainClass}Forge() {`,
        `        ${mainClass}.init();`,
        "    }",
        "}",
        "",
      ].join("\n"),
    });
  } else {
    files.push({
      path: "neoforge/build.gradle",
      contents: [
        "architectury {",
        "    neoForge()",
        "}",
        "",
        "dependencies {",
        '    neoForge "net.neoforged:neoforge:${project.neoforge_version}"',
        '    implementation "dev.architectury:architectury-neoforge:${project.architectury_api}"',
        "    implementation project(path: ':common', configuration: 'namedElements')",
        "}",
        "",
      ].join("\n"),
    });
    files.push({
      path: "neoforge/src/main/resources/META-INF/neoforge.mods.toml",
      contents: [
        'modLoader="javafml"',
        'loaderVersion="[1,)"',
        'license="MIT"',
        "",
        "[[mods]]",
        `modId="${leaf}"`,
        `version="${context.version}"`,
        `displayName="${context.name}"`,
        "",
      ].join("\n"),
    });
    files.push({
      path: `neoforge/src/main/java/${pkg}/neoforge/${mainClass}NeoForge.java`,
      contents: [
        `package ${context.packageName}.neoforge;`,
        "",
        `import ${context.packageName}.${mainClass};`,
        "import net.neoforged.fml.common.Mod;",
        "",
        "/** NeoForge entrypoint delegating to the common initializer. */",
        `@Mod(${mainClass}NeoForge.MOD_ID)`,
        `public class ${mainClass}NeoForge {`,
        `    public static final String MOD_ID = "${leaf}";`,
        "",
        `    public ${mainClass}NeoForge() {`,
        `        ${mainClass}.init();`,
        "    }",
        "}",
        "",
      ].join("\n"),
    });
  }

  // Extra modules: subprojects that the common code compiles against.
  for (const module of extraModules(context)) {
    const modulePackage = `${context.packageName}.${module.replace(/-/g, "")}`;
    const moduleClass = module === "api" ? `${mainClass}Api` : `${mainClass}${pascalCase(module)}`;
    files.push({
      path: `${module}/build.gradle`,
      contents: [
        "plugins {",
        "    id 'java-library'",
        "}",
        "",
        "dependencies {",
        "    api project(':common')",
        "}",
        "",
      ].join("\n"),
    });
    files.push({
      path: `${moduleSrcMain(module, false)}/${packagePath(modulePackage)}/${moduleClass}.java`,
      contents:
        module === "api"
          ? [
              `package ${modulePackage};`,
              "",
              "/**",
              ` * Public API of the ${context.name} mod.`,
              " */",
              `public interface ${moduleClass} {`,
              "}",
              "",
            ].join("\n")
          : [
              `package ${modulePackage};`,
              "",
              "/**",
              ` * ${pascalCase(module)} module of the ${context.name} mod.`,
              " */",
              `public final class ${moduleClass} {`,
              `    private ${moduleClass}() {}`,
              "}",
              "",
            ].join("\n"),
    });
  }
  return files;
};
