import {
  extraModules,
  moduleProjectPath,
  type TemplateContext,
  type TemplateFile,
} from "./types.js";

/** Java sources dir of a module: main module at root, extras in their own folder. */
export function moduleSrcMain(module: string, isMain: boolean): string {
  return isMain ? "src/main/java" : `${module}/src/main/java`;
}

/** Resources dir of a module: main module at root, extras in their own folder. */
export function moduleResources(module: string, isMain: boolean): string {
  return isMain ? "src/main/resources" : `${module}/src/main/resources`;
}

/**
 * settings.gradle of a multi-module Gradle project: the root project
 * carries the entrypoint module, every extra module is included.
 */
export function renderMultimoduleSettings(context: TemplateContext): string {
  const includes = extraModules(context).map((module) => `include '${moduleProjectPath(module)}'`);
  return [
    "pluginManagement {",
    "    repositories {",
    "        gradlePluginPortal()",
    "        mavenCentral()",
    "    }",
    "}",
    "",
    `rootProject.name = '${context.name}'`,
    "",
    "// Extra modules of this project",
    ...includes,
    "",
  ].join("\n");
}

/**
 * Extra module subproject builds: a plain java-library for api/core,
 * plus fabric/forge datagen or gametest wiring for mod modules.
 */
export function renderExtraModuleBuilds(context: TemplateContext): TemplateFile[] {
  const files: TemplateFile[] = [];
  const java = context.versions[0]?.javaVersion ?? 21;

  for (const module of extraModules(context)) {
    const isTest = module === "game-tests";
    files.push({
      path: `${module}/build.gradle`,
      contents: [
        "plugins {",
        "    id 'java-library'",
        "}",
        "",
        `version = '${context.version}'`,
        `group = '${context.packageName}'`,
        "",
        "java {",
        `    toolchain { languageVersion = JavaLanguageVersion.of(${java}) }`,
        "    withSourcesJar()",
        "}",
        "",
        "repositories {",
        "    mavenCentral()",
        "}",
        "",
        "dependencies {",
        "    api project(':')",
        ...(isTest ? ["    testImplementation platform('org.junit:junit-bom:5.10.2')"] : []),
        ...(isTest ? ["    testImplementation 'org.junit.jupiter:junit-jupiter'"] : []),
        "}",
        "",
        ...(isTest ? ["tasks.named('test', Test) {", "    useJUnitPlatform()", "}", ""] : []),
      ].join("\n"),
    });
  }
  return files;
}

/** The .gitignore used by every Gradle-based scaffold. */
export function gradleGitignore(): string {
  return ["build/", ".gradle/", "run/", ""].join("\n");
}
