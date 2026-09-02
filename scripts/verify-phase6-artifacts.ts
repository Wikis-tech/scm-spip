import { renderArtifact } from '../src/server/phase6ArtifactRuntimeV2.js';

const content = `# FCMB Proposal
Human-ready draft — verified.

| Product | Client value | Next step |
|---|---|---|
| Money Market Fund | Liquidity & yield | Meeting |

- Confirm mandate
- Agree timeline`;

async function main() {
  for (let pass = 1; pass <= 4; pass += 1) {
    for (const format of ['docx', 'pdf', 'pptx', 'xlsx'] as const) {
      const result = await renderArtifact(format, 'FCMB Proposal', content);
      if (result.buffer.length < 500) throw new Error(`${format} output is unexpectedly small`);
      const signature = result.buffer.subarray(0, 4).toString('hex');
      if (format === 'pdf' && signature !== '25504446') throw new Error('Invalid PDF signature');
      if (format !== 'pdf' && signature !== '504b0304') throw new Error(`Invalid ${format} ZIP signature`);
      console.log(`pass=${pass} format=${format} bytes=${result.buffer.length} signature=${signature}`);
    }
  }
}

void main();
