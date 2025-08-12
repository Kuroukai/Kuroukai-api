#!/usr/bin/env node
// Kuroukai Free API Key Creator Script
// Uso: node create-key.js

const readline = require('readline');
const https = require('https');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Kuroukai Free API - Criador de Chaves');
console.log('1) Localhost (http://localhost:3000)');
console.log('2) Produção (https://kuroukai-free-api.up.railway.app)');
rl.question('Escolha o ambiente (1 ou 2): ', (env) => {
  let baseUrl;
  let client;
  if (env.trim() === '1') {
    baseUrl = 'http://localhost:3000';
    client = http;
  } else if (env.trim() === '2') {
    baseUrl = 'https://kuroukai-free-api.up.railway.app';
    client = https;
  } else {
    console.log('Opção inválida. Saindo.');
    rl.close();
    return;
  }

  rl.question('ID do usuário para a chave: ', (userId) => {
    rl.question('Horas de duração da chave (padrão 24): ', (hours) => {
      const data = JSON.stringify({
        user_id: userId.trim(),
        hours: hours.trim() ? Number(hours.trim()) : 24
      });
      const url = baseUrl + '/api/keys/create';
      const opts = new URL(url);
      const options = {
        hostname: opts.hostname,
        port: opts.port || (opts.protocol === 'https:' ? 443 : 80),
        path: opts.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };
      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode === 200 || json.code === 200) {
              console.log('Chave criada com sucesso!');
              if (json.data) {
                console.log('ID:', json.data.key_id);
                console.log('Usuário:', json.data.user_id);
                console.log('Expira em:', json.data.expires_at);
                console.log('Horas válidas:', json.data.valid_for_hours);
              } else {
                console.log(json);
              }
            } else {
              console.error('Erro:', json.message || json.msg || body);
            }
          } catch (e) {
            console.error('Resposta inesperada:', body);
          }
          rl.close();
        });
      });
      req.on('error', (err) => {
        console.error('Erro de requisição:', err.message);
        rl.close();
      });
      req.write(data);
      req.end();
    });
  });
});
