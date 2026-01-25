#!/usr/bin/env node
/**
 * MCP Conformance Test Runner
 *
 * Runs official MCP conformance tests against the FRED MCP server.
 * Only tests applicable features (tools, not resources/prompts).
 */

import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

const APPLICABLE_SCENARIOS = [
  'server-initialize',
  'ping',
  'tools-list',
  'tools-call-simple-text',
  'tools-call-error',
];

const SERVER_PORT = 3999;
const SERVER_URL = `http://localhost:${SERVER_PORT}/mcp`;

async function startServer() {
  const server = spawn('node', ['build/index.js', '--http'], {
    env: { ...process.env, PORT: String(SERVER_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server failed to start within 10 seconds'));
    }, 10000);

    server.stderr?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('FRED MCP Server running')) {
        clearTimeout(timeout);
        resolve(server);
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

async function runConformanceTest(scenario) {
  return new Promise((resolve) => {
    const proc = spawn('npx', [
      '-y',
      '@modelcontextprotocol/conformance',
      'server',
      '--url', SERVER_URL,
      '--scenario', scenario,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout?.on('data', (data) => { output += data.toString(); });
    proc.stderr?.on('data', (data) => { output += data.toString(); });

    proc.on('close', () => {
      const passed = output.includes('0 failed');
      resolve({ passed, output });
    });
  });
}

async function main() {
  console.log('Starting FRED MCP Server for conformance testing...\n');

  let server = null;

  try {
    server = await startServer();
    console.log(`Server running at ${SERVER_URL}\n`);

    await delay(1000);

    const results = [];

    for (const scenario of APPLICABLE_SCENARIOS) {
      process.stdout.write(`Testing ${scenario}... `);
      const { passed, output } = await runConformanceTest(scenario);
      results.push({ scenario, passed });
      console.log(passed ? '✓ PASSED' : '✗ FAILED');
      if (!passed) {
        console.log(output);
      }
    }

    console.log('\n=== Summary ===');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`Passed: ${passed}/${results.length}`);
    console.log(`Failed: ${failed}/${results.length}`);

    if (failed > 0) {
      console.log('\nFailed scenarios:');
      results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.scenario}`));
      process.exitCode = 1;
    } else {
      console.log('\nAll conformance tests passed!');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.kill();
    }
  }
}

main();
