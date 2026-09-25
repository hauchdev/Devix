import {
  packageLeaf,
  packagePath,
  pascalCase,
  type PlatformRenderer,
  type TemplateFile,
} from "./types.js";

/**
 * Forge templates: Gradle (build.gradle + settings) with the ForgeGradle
 * plugin, `mods.toml` under META-INF and the main mod class.
 */
export const renderForge: PlatformRenderer = (context) => {
  const pkg = packagePath(context.packageName);
  const mainClass = pascalCase(context.name);
  const leaf = packageLeaf(context.packageName);
  const files: TemplateFile[] = [];

  files.push({
    path: "settings.gradle",
    contents: [
      "pluginManagement {",
      "    repositories {",
      "        gradlePluginPortal()",
      "        maven { url = 'https://maven.minecraftforge.net/' }",
      "    }",
      "}",
      "",
      `rootProject.name = '${context.name}'`,
      "",
    ].join("\n"),
  });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      "    id 'net.minecraftforge.gradle' version '[6.0,6.2)'",
      "}",
      "",
      `version = '${context.version}'`,
      `group = '${context.packageName}'`,
      "",
      "base { archivesName = '" + context.name + "' }",
      "",
      "java.toolchain.languageVersion = JavaLanguageVersion.of(17)",
      "",
      "minecraft {",
      "    mappings channel: 'official', version: '1.20.1'",
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
      "    minecraft 'net.minecraftforge:forge:1.20.1-47.3.0'",
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
    contents: ["org.gradle.jvmargs=-Xmx3G", "org.gradle.daemon=false", ""].join("\n"),
  });

  files.push({
    path: "src/main/resources/META-INF/mods.toml",
    contents: [
      'modLoader="javafml"',
      'loaderVersion="[47,)"',
      'license="MIT"',
      "",
      "[[mods]]",
      `modId="${leaf}"`,
      `version="${context.version}"`,
      `displayName="${context.name}"`,
      "",
      "[[dependencies." + leaf + "]]",
      '    modId="forge"',
      "    mandatory=true",
      '    versionRange="[47,)"',
      '    ordering="NONE"',
      '    side="BOTH"',
      "",
      "[[dependencies." + leaf + "]]",
      '    modId="minecraft"',
      "    mandatory=true",
      `    versionRange="[1.20.1,)"`,
      '    ordering="NONE"',
      '    side="BOTH"',
      "",
    ].join("\n"),
  });

  files.push({
    path: `src/main/java/${pkg}/${mainClass}.java`,
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

  files.push({
    path: ".gitignore",
    contents: ["build/", ".gradle/", "run/", ""].join("\n"),
  });

  return files;
};
