import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("Ink honors NO_COLOR while retaining required terminal controls", () => {
  const probe = `
    import { Writable } from "node:stream";
    process.stderr.write = () => true;
    const React = (await import("react")).default;
    const { render, Text } = await import("ink");
    let output = "";
    const stdout = new Writable({
      write(chunk, _encoding, done) {
        output += chunk.toString();
        done();
      },
    });
    Object.assign(stdout, { columns: 80, rows: 24, isTTY: true });
    const app = render(
      React.createElement(Text, { color: "red", bold: true }, "NO COLOR PROBE"),
      { stdout, debug: true, exitOnCtrlC: false, patchConsole: false },
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
    app.unmount();
    process.stdout.write(output);
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "--eval", probe], {
    cwd: process.cwd(),
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: undefined },
    encoding: "utf8",
  });
  assert.match(output, /NO COLOR PROBE/);
  const escape = String.fromCharCode(27);
  assert.doesNotMatch(output, new RegExp(`${escape}\\[[\\d;]*m`, "u"));
});
