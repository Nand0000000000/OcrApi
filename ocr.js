const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const extrairInformacoesComFormRecognizer = require('./extractinfo');
require('dotenv').config();


const app = express();
const upload = multer({ dest: 'uploads' });

const endpoint = process.env.ENDPOINT;
const apiKey = process.env.API_KEY;

app.post('/upload', upload.single('pdf'), async (req, res) => {
    const filePath = path.join(__dirname, req.file.path);

    console.log(`Recebido arquivo: ${req.file.originalname}`);

    try {
        const analyzeResponse = await axios.post(`${endpoint}/formrecognizer/v2.1/layout/analyze`, fs.readFileSync(filePath), {
            headers: {
                'Content-Type': 'application/pdf',
                'Ocp-Apim-Subscription-Key': apiKey
            }
        });

        const operationLocation = analyzeResponse.headers['operation-location'];

        if (!operationLocation) {
            throw new Error('Header operation-location não encontrado na resposta do Form Recognizer.');
        }

        let result;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            result = await axios.get(operationLocation, {
                headers: { 'Ocp-Apim-Subscription-Key': apiKey }
            });

            console.log('Retorno da API do Form Recognizer:', result.data.status);
        } while (result.data.status !== 'succeeded' && result.data.status !== 'failed');

        if (result.data.status === 'failed') {
            throw new Error('A operação de análise falhou.');
        }

        const text = result.data.analyzeResult.readResults.map(result => result.lines.map(line => line.text).join('\n')).join('\n');

        const outputPath = path.join(__dirname, 'resposta.txt');
        fs.writeFileSync(outputPath, text);

        const extractedInfo = await extrairInformacoesComFormRecognizer(outputPath);

        res.json({ text, extractedInfo });
    } catch (error) {
        console.error('Erro durante o processo de análise:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao processar análise' });
    } finally {
        fs.unlinkSync(filePath);
    }
});

const port = process.env.PORT || 3003;
app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
