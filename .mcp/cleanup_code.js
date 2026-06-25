const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const postcssScss = require('postcss-scss');

async function run() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error("Usage: node cleanup_code.js <action: comment|remove> <target: dead|duplicate|all> <file_path> <json_report_path>");
        process.exit(1);
    }

    const action = args[0];
    const target = args[1];
    const filePath = args[2];
    const jsonPath = args[3];

    if (!fs.existsSync(filePath)) {
        console.error("Error: File not found at", filePath);
        process.exit(1);
    }
    if (!fs.existsSync(jsonPath)) {
        console.error("Error: JSON report not found at", jsonPath);
        process.exit(1);
    }

    const ext = path.extname(filePath).toLowerCase();
    const isCss = ext === '.css' || ext === '.scss';

    const outputData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    let originalContent = fs.readFileSync(filePath, 'utf8');

    // BACKUP
    const backupDate = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = filePath + '.backup_' + backupDate;
    fs.writeFileSync(backupPath, originalContent);
    console.log(`[OK] Created backup at: ${backupPath}`);

    let deadLines = [];
    let duplicateLines = [];
    let duplicateProps = [];

    if (target === 'dead' || target === 'all') {
        if (outputData.dead_items) {
            deadLines = outputData.dead_items.map(item => item.line);
        }
    }

    if (target === 'duplicate' || target === 'all') {
        if (outputData.duplicates) {
            outputData.duplicates.forEach(dup => {
                if (dup.type === 'declaration' && dup.line) {
                    duplicateProps.push(dup.line);
                } else if (dup.lines && dup.lines.length >= 2) {
                    duplicateLines.push(dup.lines[1]);
                }
            });
        }
    }

    const targetLines = new Set([...deadLines, ...duplicateLines]);
    const targetProps = new Set(duplicateProps);

    if (targetLines.size === 0 && targetProps.size === 0) {
        console.log("Không có dòng nào cần xử lý theo file report.");
        return;
    }

    let count = 0;
    let result = "";

    if (isCss) {
        try {
            const root = postcssScss.parse(originalContent);

            // Xử lý Declaration trùng lặp trước
            if (targetProps.size > 0) {
                root.walkDecls(decl => {
                    const line = decl.source && decl.source.start ? decl.source.start.line : 0;
                    if (targetProps.has(line)) {
                        if (action === 'remove') {
                            decl.remove();
                        } else {
                            const commentText = `[CLEANUP DUP] ${decl.prop}: ${decl.value};`;
                            decl.replaceWith(postcss.comment({ text: commentText }));
                        }
                        count++;
                    }
                });
            }

            // Xử lý Rule
            root.walkRules(rule => {
                const line = rule.source && rule.source.start ? rule.source.start.line : 0;
                if (targetLines.has(line)) {
                    // CASCADE PROTECTION
                    let hasActiveChild = false;
                    rule.walkRules(childRule => {
                        const childLine = childRule.source && childRule.source.start ? childRule.source.start.line : 0;
                        if (!targetLines.has(childLine)) {
                            hasActiveChild = true;
                        }
                    });

                    if (hasActiveChild) {
                        // CHỈ XÓA THUỘC TÍNH, GIỮ LẠI KHUNG SƯỜN ĐỂ BẢO VỆ CON
                        rule.walkDecls(decl => {
                            decl.remove();
                        });
                        count++;
                        console.log(`[CASCADE PROTECTED] Removed properties but kept rule framework at line ${line}`);
                    } else {
                        if (action === 'remove') {
                            rule.remove();
                        } else if (action === 'comment') {
                            let ruleString = '';
                            postcssScss.stringify(rule, (str) => { ruleString += str; });
                            ruleString = ruleString.replace(/\/\*/g, '//').replace(/\*\//g, '//');
                            const commentText = `[CLEANUP ${target.toUpperCase()}] ` + ruleString;
                            const commentNode = postcss.comment({ text: commentText });
                            rule.replaceWith(commentNode);
                        }
                        count++;
                    }
                }
            });

            // Xóa @media rỗng
            root.walkAtRules('media', atRule => {
                if (!atRule.nodes || atRule.nodes.length === 0) {
                    atRule.remove();
                }
            });

            postcssScss.stringify(root, (str) => { result += str; });
        } catch (e) {
            console.error("Lỗi khi parse CSS AST:", e);
            process.exit(1);
        }
    } else {
        // ... (Keep existing JS logic if any)
        let lines = originalContent.split('\n');
        targetLines.forEach(lineNum => {
            const idx = lineNum - 1;
            if (idx >= 0 && idx < lines.length) {
                if (action === 'remove') {
                    lines[idx] = '';
                } else if (action === 'comment') {
                    if (!lines[idx].trim().startsWith('//')) {
                        lines[idx] = '// [CLEANUP] ' + lines[idx];
                    }
                }
                count++;
            }
        });
        result = lines.join('\n');
    }

    fs.writeFileSync(filePath, result);
    console.log(`[SUCCESS] Đã ${action === 'remove' ? 'xoá' : 'comment'} thành công ${count} khối mã!`);
}

run();
