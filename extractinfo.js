
const fs = require('fs');

async function extrairInformacoesComFormRecognizer(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const wordCount = text.split(/\s+/).length;

    return {
        wordCount,
    };
}

module.exports = extrairInformacoesComFormRecognizer;
