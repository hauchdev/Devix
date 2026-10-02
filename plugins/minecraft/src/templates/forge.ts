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
 * Forge templates: ForgeGradle build driven by the version catalog,
 * `mods.toml` under META-INF and the `@Mod` main class; multi-module
 * aware like every Gradle renderer.
 */
export const renderForge: PlatformRenderer = (context) => {
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
          "maven { url = 'https://maven.minecraftforge.net/' }",
          "mavenCentral()",
        ]),
  });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      `    id 'net.minecraftforge.gradle' version '${deps.forgegradle_version ?? "[6.0,6.2)"}'`,
      "}",
      "",
      `version = '${context.version}'`,
      `group = '${context.packageName}'`,
      "",
      "base { archivesName = '" + context.name + "' }",
      "",
      `java.toolchain.languageVersion = JavaLanguageVersion.of(${String(context.versions[0]?.javaVersion ?? 17)})`,
      "",
      "minecraft {",
      `    mappings channel: 'official', version: '${deps.minecraft_version ?? "1.20.1"}'`,
      "    runs {",
      "        client { workingDirectory project.file('run') }",
      "        server { workingDirectory project.file('run') }",
      "    }",
      "}",
      "",
      "repositories {",
      "    mavenCentral()",
      "}",
      "",
      "dependencies {",
      `    minecraft 'net.minecraftforge:forge:${"${project.forge_version}"}'`,
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
      "org.gradle.daemon=false",
      "",
      "# Version catalog (managed by devix minecraft init --mc)",
      ...Object.entries(deps).map(([key, value]) => `${key}=${value}`),
      "",
    ].join("\n"),
  });

  files.push({
    path: `${moduleResources(context.modules[0] ?? "main", true)}/META-INF/mods.toml`,
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
      `[[dependencies.${leaf}]]`,
      '    modId="forge"',
      "    mandatory=true",
      `    versionRange="${deps.forge_loader_version ?? "[47,)"}"`,
      '    ordering="NONE"',
      '    side="BOTH"',
      "",
      `[[dependencies.${leaf}]]`,
      '    modId="minecraft"',
      "    mandatory=true",
      `    versionRange="[${deps.minecraft_version ?? "1.20.1"},)"`,
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
      "import net.minecraftforge.fml.common.Mod;",
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
