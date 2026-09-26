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

/** Java toolchain + compile blocks shared by every Gradle renderer. */
export function gradleJavaBlocks(java: number): string[] {
  return [
    "java {",
    `    toolchain { languageVersion = JavaLanguageVersion.of(${String(java)}) }`,
    "}",
    "",
    "tasks.withType(JavaCompile).configureEach {",
    "    it.options.encoding = 'UTF-8'",
    `    it.options.release = ${String(java)}`,
    "}",
    "",
  ];
}

/** settings.gradle of a single-module Gradle project. */
export function renderSingleModuleSettings(name: string, pluginRepos: readonly string[]): string {
  return [
    "pluginManagement {",
    "    repositories {",
    ...pluginRepos.map((repo) => `        ${repo}`),
    "        gradlePluginPortal()",
    "    }",
    "}",
    "",
    `rootProject.name = '${name}'`,
    "",
  ].join("\n");
}

/** Dependency block entries of the extra modules (api/core/...). */
export function extraModuleDependencies(context: TemplateContext): string[] {
  return extraModules(context).map(
    (module) => `    implementation project('${moduleProjectPath(module)}')`,
  );
}

export type { TemplateContext, TemplateFile };
