const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\mohan\\OneDrive\\Desktop\\ReactNative\\noor-frontend\\src\\screens\\AdminDashboardScreen.tsx', 'utf8');

const styleBlockStart = content.indexOf('const styles = StyleSheet.create({');
if (styleBlockStart === -1) {
    console.log('StyleSheet.create not found');
    process.exit(1);
}

const lines = content.split('\n');
const keys = [];
let insideStyles = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('const styles = StyleSheet.create({')) insideStyles = true;
    if (insideStyles) {
        // Match keys with various indentation
        const match = line.match(/^\s+([a-zA-Z0-9]+):\s*{/);
        if (match) {
            keys.push({ key: match[1], line: i + 1 });
        }
    }
}

const keyMap = {};
keys.forEach(k => {
    if (keyMap[k.key]) {
        console.log(`Duplicate key found: "${k.key}" at line ${k.line} (previous at line ${keyMap[k.key]})`);
    } else {
        keyMap[k.key] = k.line;
    }
});
