import {
  extraModuleDependencies,
  gradleJavaBlocks,
  moduleResources,
  moduleSrcMain,
  renderSingleModuleSettings,
} from "./gradle-common.js";
import { renderExtraModuleBuilds, renderMultimoduleSettings } from "./gradle-multimodule.js";
import {
  extraModules,
  packageLeaf,
  packagePath,
  pascalCase,
  type PlatformRenderer,
  type TemplateContext,
  type TemplateFile,
} from "./types.js";

/** The fabric.mod.json of one loader module. */
function fabricModJson(context: TemplateContext, entryPackage: string): string {
  const leaf = packageLeaf(context.packageName);
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      id: leaf,
      version: context.version,
      name: context.name,
      environment: "*",
      entrypoints: {
        main: [`${entryPackage}.${pascalCase(context.name)}`],
      },
      depends: {
        fabricloader: `>=${context.versions[0]?.deps.fabric_loader ?? "0.16.0"}`,
        minecraft: `~${context.versions[0]?.minecraft ?? "1.21.1"}`,
        java: `>=${context.versions[0]?.javaVersion ?? 21}`,
      },
    },
    null,
    2,
  )}\n`;
}

/** The ModInitializer class of one module. */
function initializer(context: TemplateContext, entryPackage: string, className: string): string {
  return [
    `package ${entryPackage};`,
    "",
    "import net.fabricmc.api.ModInitializer;",
    "",
    "/**",
    ` * Entry point of the ${context.name} mod.`,
    " */",
    `public class ${className} implements ModInitializer {`,
    "    @Override",
    "    public void onInitialize() {",
    `        System.out.println("[${context.name}] initialized");`,
    "    }",
    "}",
    "",
  ].join("\n");
}

/**
 * Fabric templates: Loom build driven entirely by the version catalog
 * (gradle.properties), `fabric.mod.json` with an entrypoint, and —
 * when modules were requested — a Gradle multi-project with the
 * entrypoint at the root plus api/core/datagen subprojects.
 */
export const renderFabric: PlatformRenderer = (context) => {
  const deps = context.versions[0]?.deps ?? {};
  const mainClass = pascalCase(context.name);
  const pkg = packagePath(context.packageName);
  const files: TemplateFile[] = [];

  const settings = context.multimodule
    ? renderMultimoduleSettings(context)
    : renderSingleModuleSettings(context.name, [
        "maven { name = 'Fabric'; url = 'https://maven.fabricmc.net/' }",
        "mavenCentral()",
      ]);
  files.push({ path: "settings.gradle", contents: settings });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      `    id 'fabric-loom' version '${context.versions[0]?.loom ?? "1.9-SNAPSHOT"}'`,
      "    id 'maven-publish'",
      "}",
      "",
      `version = '${context.version}'`,
      `group = '${context.packageName}'`,
      "",
      "base { archivesName = '" + context.name + "' }",
      "",
      "repositories {}",
      "",
      "dependencies {",
      '    minecraft "com.mojang:minecraft:${project.minecraft_version}"',
      '    mappings "net.fabricmc:yarn:${project.yarn_mappings}:v2"',
      '    modImplementation "net.fabricmc:fabric-loader:${project.fabric_loader}"',
      '    modImplementation "net.fabricmc.fabric-api:fabric-api:${project.fabric_api}"',
      ...extraModuleDependencies(context),
      "}",
      "",
      "processResources {",
      "    inputs.property 'version', project.version",
      "    filesMatching('fabric.mod.json') {",
      "        expand version: project.version",
      "    }",
      "}",
      "",
      ...gradleJavaBlocks(context.versions[0]?.javaVersion ?? 21),
    ].join("\n"),
  });

  files.push({
    path: "gradle.properties",
    contents: [
      "org.gradle.jvmargs=-Xmx2G",
      "org.gradle.parallel=true",
      "",
      "# Version catalog (managed by devix minecraft init --mc)",
      ...Object.entries(deps).map(([key, value]) => `${key}=${value}`),
      "",
    ].join("\n"),
  });

  const mainIs = context.modules[0] ?? "main";
  files.push({
    path: `${moduleResources(mainIs, true)}/fabric.mod.json`,
    contents: fabricModJson(context, context.packageName),
  });
  files.push({
    path: `${moduleSrcMain(mainIs, true)}/${pkg}/${mainClass}.java`,
    contents: initializer(context, context.packageName, mainClass),
  });

  // Extra modules: an api module ships a marker interface, the rest a starter class.
  for (const module of extraModules(context)) {
    const modulePackage = `${context.packageName}.${module.replace(/-/g, "")}`;
    const moduleClass = module === "api" ? `${mainClass}Api` : `${mainClass}${pascalCase(module)}`;
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
  files.push(...renderExtraModuleBuilds(context));

  files.push({ path: "src/main/resources/assets/.gitkeep", contents: "" });
  return files;
};
