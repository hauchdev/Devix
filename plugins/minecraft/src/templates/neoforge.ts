import {
  extraModuleDependencies,
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
  type TemplateFile,
} from "./types.js";

/**
 * NeoForge templates: NeoGradle/ModDevGradle build driven by the
 * version catalog, `neoforge.mods.toml` and the `@Mod` main class;
 * multi-module aware like every Gradle renderer.
 */
export const renderNeoForge: PlatformRenderer = (context) => {
  const deps = context.versions[0]?.deps ?? {};
  const mainClass = pascalCase(context.name);
  const pkg = packagePath(context.packageName);
  const leaf = packageLeaf(context.packageName);
  const files: TemplateFile[] = [];

  files.push({
    path: "settings.gradle",
    contents: context.multimodule
      ? renderMultimoduleSettings(context)
      : renderSingleModuleSettings(context.name, [
          "maven { url = 'https://maven.neoforged.net/releases' }",
          "mavenCentral()",
        ]),
  });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      `    id 'net.neoforged.gradle.userdev' version '${deps.neogradle_version ?? "7.0.171"}'`,
      "}",
      "",
      `version = '${context.version}'`,
      `group = '${context.packageName}'`,
      "",
      "base { archivesName = '" + context.name + "' }",
      "",
      `java.toolchain.languageVersion = JavaLanguageVersion.of(${String(context.versions[0]?.javaVersion ?? 21)})`,
      "",
      "repositories {",
      "    mavenCentral()",
      "    maven { url = 'https://maven.neoforged.net/releases' }",
      "}",
      "",
      "dependencies {",
      '    implementation "net.neoforged:neoforge:${project.neoforge_version}"',
      ...extraModuleDependencies(context),
      "}",
      "",
      "tasks.withType(JavaCompile).configureEach {",
      "    it.options.encoding = 'UTF-8'",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "gradle.properties",
    contents: [
      "org.gradle.jvmargs=-Xmx3G",
      "",
      "# Version catalog (managed by devix minecraft init --mc)",
      ...Object.entries(deps).map(([key, value]) => `${key}=${value}`),
      "",
    ].join("\n"),
  });

  files.push({
    path: `${moduleResources(context.modules[0] ?? "main", true)}/META-INF/neoforge.mods.toml`,
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
      `[[dependencies.${leaf}]]`,
      '    modId="neoforge"',
      '    type="required"',
      `    versionRange="${deps.neoforge_range ?? "[21.0,)"}"`,
      '    ordering="NONE"',
      '    side="BOTH"',
      "",
      `[[dependencies.${leaf}]]`,
      '    modId="minecraft"',
      '    type="required"',
      `    versionRange="[${deps.minecraft_version ?? "1.21.1"},)"`,
      '    ordering="NONE"',
      '    side="BOTH"',
      "",
    ].join("\n"),
  });

  files.push({
    path: `${moduleSrcMain(context.modules[0] ?? "main", true)}/${pkg}/${mainClass}.java`,
    contents: [
      `package ${context.packageName};`,
      "",
      "import net.neoforged.fml.common.Mod;",
      "",
      "/**",
      ` * Entry point of the ${context.name} mod.`,
      " */",
      `@Mod(${mainClass}.MOD_ID)`,
      `public class ${mainClass} {`,
      `    public static final String MOD_ID = "${leaf}";`,
      "",
      `    public ${mainClass}() {`,
      `        System.out.println("[${context.name}] constructor");`,
      "    }",
      "}",
      "",
    ].join("\n"),
  });

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

  return files;
};
