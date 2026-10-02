import { describe, expect, it } from "vitest";

import {
  DEFAULT_MINECRAFT_VERSION,
  MINECRAFT_VERSIONS,
  isKnownMinecraftVersion,
  resolveVersionSpec,
} from "../src/index.js";

describe("version catalog", () => {
  it("loads from catalog/versions.json", () => {
    expect(MINECRAFT_VERSIONS.length).toBeGreaterThan(0);
    expect(DEFAULT_MINECRAFT_VERSION).toBe(MINECRAFT_VERSIONS[0]?.minecraft);
  });

  it("every entry has the required fields", () => {
    for (const spec of MINECRAFT_VERSIONS) {
      expect(typeof spec.minecraft).toBe("string");
      expect(spec.minecraft.length).toBeGreaterThan(0);
      expect(Array.isArray(spec.aliases)).toBe(true);
      expect(typeof spec.label).toBe("string");
      expect(typeof spec.javaVersion).toBe("number");
      expect(typeof spec.loom).toBe("string");
    }
  });

  it("default version resolves to the first catalog entry", () => {
    const spec = resolveVersionSpec(DEFAULT_MINECRAFT_VERSION);
    expect(spec.minecraft).toBe(DEFAULT_MINECRAFT_VERSION);
  });

  it("aliases are recognized", () => {
    expect(isKnownMinecraftVersion("stable")).toBe(true);
    expect(isKnownMinecraftVersion("legacy")).toBe(true);
  });

  it("rejects unknown versions", () => {
    expect(isKnownMinecraftVersion("0.0.0-does-not-exist")).toBe(false);
    expect(() => resolveVersionSpec("0.0.0-does-not-exist")).toThrow();
  });
});
