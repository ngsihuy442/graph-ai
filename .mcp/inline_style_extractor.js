const fs = require('fs');
const crypto = require('crypto');

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

function processFile(filePath, scssOutputPath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let scssRules = [];

    // Simple tag parsing using regex that ignores PHP blocks
    // This regex looks for HTML tags but we must be careful with PHP inside tags
    // For a robust way without a full AST:
    let newContent = content.replace(/<([a-zA-Z0-9\-]+)([^>]+)>/g, (match, tagName, attrsStr) => {
        // If the tag contains a PHP block like <?php ... ?> we need to be careful
        // Actually, matching attributes using regex:
        let hasStyle = false;
        let styleContent = '';
        let hasId = false;
        let idContent = '';
        let hasClass = false;
        
        const styleRegex = /\bstyle\s*=\s*(['"])([\s\S]*?)\1/i;
        const styleMatch = attrsStr.match(styleRegex);
        if (styleMatch) {
            styleContent = styleMatch[2];
            // Skip if style contains PHP code
            if (styleContent.includes('<?')) return match;

            const idRegex = /\bid\s*=\s*(['"])(.*?)\1/i;
            const idMatch = attrsStr.match(idRegex);
            if (idMatch && !idMatch[2].includes('<?')) {
                idContent = idMatch[2];
            }

            // Generate class name
            const hash = md5(styleContent.trim().split(';').map(s => s.trim()).filter(s => s).sort().join(';'));
            const newClassName = `u-style-${hash}`;

            // Create SCSS rule
            let selector = `.${newClassName}`;
            if (idContent) {
                // To increase specificity
                selector = `#${idContent}.${newClassName}`;
            }

            scssRules.push(`${selector} { ${styleContent} }`);

            // Remove style attribute
            let newAttrsStr = attrsStr.replace(styleRegex, '');

            // Inject class
            const classRegex = /\bclass\s*=\s*(['"])([\s\S]*?)\1/i;
            const classMatch = newAttrsStr.match(classRegex);
            if (classMatch) {
                let existingClasses = classMatch[2];
                if (!existingClasses.includes(newClassName)) {
                    let updatedClasses = existingClasses + ' ' + newClassName;
                    newAttrsStr = newAttrsStr.replace(classRegex, `class=${classMatch[1]}${updatedClasses}${classMatch[1]}`);
                }
            } else {
                newAttrsStr += ` class="${newClassName}"`;
            }

            return `<${tagName}${newAttrsStr}>`;
        }
        return match;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        if (scssRules.length > 0) {
            let existingScss = fs.existsSync(scssOutputPath) ? fs.readFileSync(scssOutputPath, 'utf8') : '';
            existingScss += '\n\n' + scssRules.join('\n');
            fs.writeFileSync(scssOutputPath, existingScss, 'utf8');
        }
        return scssRules.length;
    }
    return 0;
}

const file = process.argv[2];
const scssOut = process.argv[3];
if (file && scssOut) {
    const count = processFile(file, scssOut);
    console.log(`[SUCCESS] Extracted ${count} inline styles.`);
}
