import { describe, expect, it } from 'vitest';
import { reviewCase } from '../orchestrator.js';
import { presetCases } from '../sample.js';

describe('Multi-Agent Workflow Performance & Benchmarking', () => {
  const presets = presetCases();
  const sampleCase = presets[0];

  it('should execute 50 concurrent multi-agent workflows under 500ms total', async () => {
    const startTime = performance.now();
    const count = 50;

    const tasks = Array.from({ length: count }, () =>
      reviewCase(sampleCase, 'HUMAN_APPROVAL_REQUIRED')
    );

    const results = await Promise.all(tasks);
    const duration = performance.now() - startTime;
    const avgLatency = duration / count;

    console.log(`\n⚡ Performance Benchmark Results:`);
    console.log(`- Total Executed Workflows: ${count}`);
    console.log(`- Total Duration: ${duration.toFixed(2)} ms`);
    console.log(`- Average Latency per Workflow: ${avgLatency.toFixed(2)} ms`);
    console.log(`- Throughput: ${(count / (duration / 1000)).toFixed(2)} workflows/sec`);

    expect(results).toHaveLength(count);
    expect(duration).toBeLessThan(1000); // 50 parallel workflows finish within 1 second
    expect(avgLatency).toBeLessThan(50); // Average latency under 50ms per multi-agent review
  });
});
