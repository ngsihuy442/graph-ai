const fs = require('fs');
const postcss = require('postcss');
const postcssScss = require('postcss-scss');

const cssPath = process.argv[2];
const scssPath = process.argv[3];
const outPath = process.argv[4];

if (!cssPath || !scssPath || !outPath) {
    console.error("Usage: node rescue_scss.js <good_css> <broken_scss> <output_scss>");
    process.exit(1);
}

try {
    const brokenScss = fs.readFileSync(scssPath, 'utf8');
    const goodCss = fs.readFileSync(cssPath, 'utf8');

    // 1. Trích xuất biến từ SCSS hỏng (Map: Value -> Variable Name)
    // Ưu tiên các biến độ dài lớn để tránh replace nhầm (ví dụ: biến 0)
    const varMap = new Map();
    let varDefinitions = [];
    const rootScss = postcssScss.parse(brokenScss);
    
    rootScss.walkDecls(decl => {
        if (decl.prop.startsWith('$')) {
            const val = decl.value.trim();
            varMap.set(val, decl.prop);
            varDefinitions.push(`${decl.prop}: ${val};`);
        }
    });

    // 2. Parse CSS tốt và thay thế giá trị Hardcode bằng Biến
    const rootCss = postcss.parse(goodCss);
    let replacedCount = 0;

    // Sắp xếp varMap theo độ dài value giảm dần để replace chính xác (VD: "#fff" trước, "0" sau - mặc dù ta nên bỏ qua các biến quá ngắn)
    const sortedVars = Array.from(varMap.entries()).sort((a, b) => b[0].length - a[0].length);

    const SKIP_VALUES = new Set(['0', '1', 'none', 'auto', 'inherit', 'initial', 'unset', 'solid', 'block', 'inline', 'flex', 'absolute', 'relative', 'transparent']);
    const MIN_LENGTH = 3;

    rootCss.walkDecls(decl => {
        let newVal = decl.value;
        for (const [val, varName] of sortedVars) {
            if (SKIP_VALUES.has(val.toLowerCase()) || (val.length < MIN_LENGTH && !val.startsWith('#'))) continue;

            if (newVal.includes(val)) {
                // Thoát các ký tự đặc biệt của regex
                const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // Regex tìm đúng từ/mã màu, tránh trường hợp tìm '#fff' lại match '#ffffff'
                const regex = new RegExp(`(^|\\s|\\(|,)${escapeRegExp(val)}($|\\s|\\)|,|;)`, 'g');
                
                if (regex.test(newVal)) {
                    newVal = newVal.replace(regex, `$1${varName}$2`);
                } else if (newVal === val) {
                    newVal = varName;
                }
            }
        }
        
        if (newVal !== decl.value) {
            decl.value = newVal;
            replacedCount++;
        }
    });

    // 3. Tái tạo cấu trúc Lồng nhau (Nesting) cơ bản (Gộp các selector có chung tiền tố)
    // Thuật toán: Nhóm các Rule có class đầu tiên giống nhau.
    let groupedRules = new Map();
    let outputAST = postcss.root();

    rootCss.each(node => {
        if (node.type === 'rule') {
            const selectors = node.selector.split(',').map(s => s.trim());
            // Lấy từ khóa đầu tiên của selector đầu tiên làm gốc (Ví dụ: .navbar .logo -> .navbar)
            const firstPart = selectors[0].split(' ')[0];
            
            if (firstPart.startsWith('.') || firstPart.startsWith('#')) {
                if (!groupedRules.has(firstPart)) {
                    groupedRules.set(firstPart, []);
                }
                groupedRules.get(firstPart).push(node);
            } else {
                outputAST.append(node); // Các thẻ (body, html...) để nguyên
            }
        } else {
            outputAST.append(node); // @media, comments...
        }
    });

    for (const [baseClass, rules] of groupedRules.entries()) {
        if (rules.length === 1 && rules[0].selector === baseClass) {
            outputAST.append(rules[0]);
        } else {
            // Tạo một Rule cha
            let parentRule = postcss.rule({ selector: baseClass });
            rules.forEach(rule => {
                if (rule.selector === baseClass) {
                    // Chuyển các thuộc tính của chính nó vào cha
                    rule.walkDecls(decl => parentRule.append(decl.clone()));
                } else {
                    // Xử lý lồng nhau: .navbar .logo -> &.logo hoặc .logo
                    let newSelector = rule.selector.split(',').map(sel => {
                        let s = sel.trim();
                        if (s.startsWith(baseClass)) {
                            let child = s.replace(baseClass, '').trim();
                            // Nếu class viết liền (.navbar.active) -> &.active, nếu cách (.navbar .logo) -> .logo
                            return child.startsWith('.') || child.startsWith(':') || child.startsWith('#') ? `&${child}` : child;
                        }
                        return s;
                    }).join(', ');
                    
                    let childRule = postcss.rule({ selector: newSelector });
                    rule.walkDecls(decl => childRule.append(decl.clone()));
                    parentRule.append(childRule);
                }
            });
            outputAST.append(parentRule);
        }
    }

    // 4. Xuất file
    let outContent = "// ==================================================\n";
    outContent += "// 🚑 BẢN PHỤC HỒI (RESCUED SCSS)\n";
    outContent += "// Tự động tạo bởi Antigravity MCP Agent\n";
    outContent += "// ==================================================\n\n";
    
    if (varDefinitions.length > 0) {
        outContent += "// --- 1. BIẾN ĐƯỢC KHÔI PHỤC TỪ SCSS HỎNG ---\n";
        outContent += varDefinitions.join('\n') + "\n\n";
    }

    outContent += "// --- 2. CẤU TRÚC PHỤC HỒI TỪ CSS TỐT ---\n";
    postcssScss.stringify(outputAST, (result) => {
        outContent += result;
    });

    fs.writeFileSync(outPath, outContent, 'utf8');
    console.log(`[SUCCESS] Đã phục hồi cấu trúc lồng nhau (Nesting) và thay thế ${replacedCount} giá trị bằng biến.\nSaved to: ${outPath}`);

} catch (e) {
    console.error("Lỗi: " + e.message);
    process.exit(1);
}
