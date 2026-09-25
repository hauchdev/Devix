import {
  packageLeaf,
  packagePath,
  pascalCase,
  type PlatformRenderer,
  type TemplateFile,
} from "./types.js";

/**
 * Architectury templates: a Gradle multi-project with `common`,
 * `fabric` and `forge` subprojects wired through the Architectury
 * plugin, plus the shared entrypoint contract.
 */
export const renderArchitectury: PlatformRenderer = (context) => {
  const pkg = packagePath(context.packageName);
  const mainClass = pascalCase(context.name);
  const leaf = packageLeaf(context.packageName);
  const files: TemplateFile[] = [];

  files.push({
    path: "settings.gradle",
    contents: [
      "pluginManagement {",
      "    repositories {",
      "        maven { url = 'https://maven.fabricmc.net/' }",
      "        maven { url = 'https://maven.minecraftforge.net/' }",
      "        maven { url = 'https://maven.architectury.dev/' }",
      "        mavenCentral()",
      "        gradlePluginPortal()",
      "    }",
      "}",
      "",
      "include 'common'",
      "include 'fabric'",
      "include 'forge'",
      "",
      `rootProject.name = '${context.name}'`,
      "",
    ].join("\n"),
  });

  files.push({
    path: "build.gradle",
    contents: [
      "plugins {",
      "    id 'architectury-plugin' version '3.4-SNAPSHOT'",
      "    id 'dev.architectury.loom' version '1.7-SNAPSHOT' apply false",
      "}",
      "",
      "architectury {",
      "    minecraft = '1.21.1'",
      "}",
      "",
      "subprojects {",
      "    apply plugin: 'dev.architectury.loom'",
      "    java.toolchain.languageVersion = JavaLanguageVersion.of(21)",
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
      "minecraft_version=1.21.1",
      "architectury_version=13.0.8",
      "fabric_api_version=0.103.0+1.21.1",
      "forge_version=1.21.1-52.0.24",
      "",
    ].join("\n"),
  });

  files.push({
    path: "common/build.gradle",
    contents: [
      "architectury {",
      "    common('fabric', 'forge')",
      "}",
      "",
      "dependencies {",
      "    modImplementation 'net.fabricmc:fabric-loader:0.16.5'",
      "    api 'dev.architectury:architectury-fabric:' + project.architectury_version",
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
      "    minecraft 'com.mojang:minecraft:' + project.minecraft_version",
      "    mappings 'net.fabricmc:yarn:1.21.1+build.3:v2'",
      "    modImplementation 'net.fabricmc:fabric-loader:0.16.5'",
      "    modImplementation 'net.fabricmc.fabric-api:fabric-api:' + project.fabric_api_version",
      "    modImplementation 'dev.architectury:architectury-fabric:' + project.architectury_version",
      "    modImplementation project(path: ':common', configuration: 'namedElements')",
      "}",
      "",
    ].join("\n"),
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
      "        " + mainClass + ".init();",
      "    }",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "forge/build.gradle",
    contents: [
      "architectury {",
      "    forge()",
      "}",
      "",
      "dependencies {",
      "    forge 'net.minecraftforge:forge:' + project.forge_version",
      "    implementation 'dev.architectury:architectury-forge:' + project.architectury_version",
      "    implementation project(path: ':common', configuration: 'namedElements')",
      "}",
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
      "        " + mainClass + ".init();",
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
