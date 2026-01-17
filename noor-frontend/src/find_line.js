const fs = require('fs');
const path = 'c:\\Users\\srid5\\Desktop\\prolync documents\\oh my godddd\\Final_Clientnoor\\noor-frontend\\src\\screens\\EmployeeProjectDetailsScreen.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes("activeTab === 'Tasks'") || line.includes("['Tasks', 'Materials']")) {
        console.log(`Found at line ${index + 1}: ${line.trim()}`);
    }
});
