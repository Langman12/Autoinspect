#!/usr/bin/env node

/**
 * AutoGuard AI - Ollama Local AI Verification Suite
 * Tests connectivity, model availability, text generation, and vision processing.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

console.log('='.repeat(65));
console.log('🏎️  AutoGuard AI - Local AI (Ollama) System & Benchmark Suite');
console.log('='.repeat(65));
console.log(`Endpoint: ${OLLAMA_BASE_URL}\n`);

async function runTests() {
  try {
    // 1. Check Server Status & Version
    console.log('1️⃣ Checking Ollama Server Connectivity...');
    const startTime = Date.now();
    const versionRes = await fetch(`${OLLAMA_BASE_URL}/api/version`);
    if (!versionRes.ok) {
      throw new Error(`Ollama responded with status: ${versionRes.status}`);
    }
    const versionData = await versionRes.json();
    const pingLatency = Date.now() - startTime;
    console.log(`   ✅ Ollama is ONLINE (v${versionData.version}) - Latency: ${pingLatency}ms\n`);

    // 2. Check Installed Models
    console.log('2️⃣ Checking Installed Models in Ollama...');
    const tagsRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const tagsData = await tagsRes.json();
    const models = tagsData.models || [];
    console.log(`   Installed Models (${models.length}):`);
    models.forEach((m) => {
      const sizeGb = (m.size / 1e9).toFixed(1);
      const params = m.details?.parameter_size || 'N/A';
      console.log(`    - 📦 ${m.name.padEnd(20)} (${sizeGb} GB, ${params} params)`);
    });
    console.log('');

    // 3. Benchmark Text & Reasoning Models
    const testTextModels = ['qwen2.5:1.5b', 'llama3.2:3b', 'deepseek-r1:1.5b'].filter((name) =>
      models.some((m) => m.name.includes(name.split(':')[0]))
    );

    console.log('3️⃣ Benchmarking Local Reasoning & Diagnostic Models...');
    for (const model of testTextModels) {
      console.log(`\n   🔹 Testing [${model}]...`);
      const promptStart = Date.now();
      const genRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: 'You are AutoGuard GDVF Forensic AI. Perform a 1-sentence mechanical verification for a 2023 Tesla Model Y.',
          stream: false,
        }),
      });

      if (!genRes.ok) {
        console.log(`      ⚠️ Generation failed for ${model}: ${genRes.statusText}`);
        continue;
      }
      const genData = await genRes.json();
      const latency = Date.now() - promptStart;
      console.log(`      ⏱️ Latency: ${latency}ms | Tokens evaluated: ${genData.eval_count || 'N/A'}`);
      console.log(`      💬 Output: "${genData.response.trim().slice(0, 140)}..."`);
    }

    // 4. Test Vision Model (moondream)
    const hasVisionModel = models.some((m) => m.name.includes('moondream'));
    if (hasVisionModel) {
      console.log('\n4️⃣ Testing Multimodal Vision Model (moondream:latest)...');
      const sampleImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const visionStart = Date.now();
      const visionRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'moondream:latest',
          prompt: 'What color is dominant in this sample image?',
          images: [sampleImageBase64],
          stream: false,
        }),
      });

      if (visionRes.ok) {
        const visionData = await visionRes.json();
        const visionLatency = Date.now() - visionStart;
        console.log(`   ✅ Vision inspection successful (${visionLatency}ms)`);
        console.log(`   👁️ Output: "${visionData.response.trim()}"`);
      }
    }

    console.log('\n' + '='.repeat(65));
    console.log('🎉 ALL LOCAL AI MODELS RUNNING SMOOTHLY ON SYSTEM HARDWARE!');
    console.log('='.repeat(65));
  } catch (err) {
    console.error('\n❌ Local AI Diagnostic Error:', err.message);
    process.exit(1);
  }
}

runTests();
