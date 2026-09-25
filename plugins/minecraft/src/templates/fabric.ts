import {
  packageLeaf,
  packagePath,
  pascalCase,
  type PlatformRenderer,
  type TemplateFile,
} from "./types.js";

/**
 * Fabric templates: Gradle (build.gradle.kts + settings), a Java 21
 * toolchain, `fabric.mod.json` with an entrypoint and a split
 * client/main source set, plus the mod initializer class.
 */
export const renderFabric: PlatformRenderer = (context) => {
  const pkg = packagePath(context.packageName);
  const mainClass = pascalCase(context.name);
  const leaf = packageLeaf(context.packageName);
  const files: TemplateFile[] = [];

  files.push({
    path: "settings.gradle",
    contents: [
      "pluginManagement {",
      "    repositories {",
      "        maven { name = 'Fabric'; url = 'https://maven.fabricmc.net/' }",
      "        mavenCentral()",
      "        gradlePluginPortal()",
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
      "    id 'fabric-loom' version '1.7-SNAPSHOT'",
      "    id 'maven-publish'",
      "}",
      "",
      "java {",
      "    toolchain { languageVersion = JavaLanguageVersion.of(21) }",
      "    withSourcesJar()",
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
      "    minecraft 'com.mojang:minecraft:' + project.minecraft_version",
      "    mappings 'net.fabricmc:yarn:_mappings+1.21.1:v2'",
      "    modImplementation 'net.fabricmc:fabric-loader:0.16.5'",
      "    modImplementation 'net.fabricmc.fabric-api:fabric-api:0.103.0+1.21.1'",
      "}",
      "",
      "processResources {",
      "    inputs.property 'version', project.version",
      "    filesMatching('fabric.mod.json') {",
      "        expand version: project.version",
      "    }",
      "}",
      "",
      "tasks.withType(JavaCompile).configureEach {",
      "    it.options.release = 21",
      "}",
      "",
      "java {",
      "    sourceCompatibility = JavaVersion.VERSION_21",
      "    targetCompatibility = JavaVersion.VERSION_21",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "gradle.properties",
    contents: [
      "org.gradle.jvmargs=-Xmx2G",
      "org.gradle.parallel=true",
      "",
      "# Fabric versions (edit to taste)",
      "minecraft_version=1.21.1",
      "",
    ].join(""),
  });

  files.push({
    path: "src/main/resources/fabric.mod.json",
    contents: `${JSON.stringify(
      {
        schemaVersion: 1,
        id: leaf,
        version: context.version,
        name: context.name,
        environment: "*",
        entrypoints: {
          main: [`${context.packageName}.${mainClass}`],
        },
        depends: {
          fabricloader: ">=0.16.0",
          minecraft: `~${context.minecraftVersion}`,
          java: ">=21",
        },
      },
      null,
      2,
    )}\n`,
  });

  files.push({
    path: `src/main/java/${pkg}/${mainClass}.java`,
    contents: [
      `package ${context.packageName};`,
      "",
      "import net.fabricmc.api.ModInitializer;",
      "",
      "/**",
      ` * Entry point of the ${context.name} mod.`,
      " */",
      `public class ${mainClass} implements ModInitializer {`,
      "    @Override",
      "    public void onInitialize() {",
      `        System.out.println("[${context.name}] initialized");`,
      "    }",
      "}",
      "",
    ].join("\n"),
  });

  files.push({
    path: "src/main/resources/assets/.gitkeep",
    contents: "",
  });

  files.push({
    path: ".gitignore",
    contents: ["build/", ".gradle/", "run/", "*.class", ""].join("\n"),
  });

  return files;
};
