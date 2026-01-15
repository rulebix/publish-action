const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Configuration from environment variables
const API_URL = process.env.REGISTRY_API || 'https://nuxt.ineceper.my.id/api/v1/publish';
const TOKEN = process.env.OIDC_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPOSITORY;
const GITHUB_SHA = process.env.GITHUB_SHA;

if (!TOKEN) {
  console.error('::error::OIDC_TOKEN is not set.');
  process.exit(1);
}

if (!GITHUB_REPO || !GITHUB_SHA) {
  console.error('::error::GITHUB_REPOSITORY or GITHUB_SHA not set.');
  process.exit(1);
}

const SPEC_FILE = 'spec.json';

async function main() {
  try {
    // 1. Read spec.json
    if (!fs.existsSync(SPEC_FILE)) {
      throw new Error(`${SPEC_FILE} not found in repository root.`);
    }

    const specContent = fs.readFileSync(SPEC_FILE, 'utf8');
    let spec;
    try {
      spec = JSON.parse(specContent);
    } catch (e) {
      throw new Error(`Failed to parse ${SPEC_FILE}: ${e.message}`);
    }

    console.log(`Read ${SPEC_FILE}, found ${spec.entries?.length || 0} entries.`);

    // 2. Process entries
    if (spec.entries && Array.isArray(spec.entries)) {
      for (const entry of spec.entries) {
        let filePath = entry.path;
        
        // Special handling for legacy/simple paths vs full paths
        // If it's a skill, the content file is at path/SKILL.md
        if (entry.type === 'skill') {
             // If path ends with SKILL.md, use it, otherwise assume it's a folder and append SKILL.md
             if (!filePath.endsWith('SKILL.md')) {
                 filePath = path.join(filePath, 'SKILL.md');
             }
        }
        
        // Resolve absolute path (relative to repo root)
        const absolutePath = path.resolve(process.cwd(), filePath);
        
        if (fs.existsSync(absolutePath)) {
            console.log(`Reading content for ${entry.id} from ${filePath}`);
            const content = fs.readFileSync(absolutePath, 'utf8');
            entry.content = content; // Inject content into the entry
        } else {
            console.warn(`::warning::File not found for entry ${entry.id}: ${filePath}. Content will be empty.`);
            // strict mode: could exit 1 here if required
        }
      }
    }

    // 3. Construct Payload
    const payload = {
      repo: GITHUB_REPO,
      commit: GITHUB_SHA,
      config: spec
    };

    // 4. Send Request
    console.log(`Sending publish request to ${API_URL}...`);
    
    await postData(API_URL, payload, TOKEN);
    
    console.log('Successfully published to Rulebix Registry.');

  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}

function postData(requestUrl, data, token) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(requestUrl);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Rulebix-Publish-Action'
      }
    };

    const req = (parsedUrl.protocol === 'https:' ? https : require('http')).request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Network error: ${e.message}`));
    });

    req.write(JSON.stringify(data));
    req.end();
  });
}

main();
