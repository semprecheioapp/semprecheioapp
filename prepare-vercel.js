const fs = require('fs');
const path = require('path');

console.log('🔧 Preparando projeto para Vercel...');

// 1. Criar package.json específico para Vercel
const vercelPackage = {
  "name": "semprecheioapp-vercel",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "lucide-react": "^0.263.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^1.14.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
};

// 2. Criar vercel.json otimizado
const vercelConfig = {
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
};

// 3. Salvar arquivos
fs.writeFileSync('package-vercel.json', JSON.stringify(vercelPackage, null, 2));
fs.writeFileSync('vercel-optimized.json', JSON.stringify(vercelConfig, null, 2));

console.log('✅ Arquivos criados:');
console.log('- package-vercel.json (package.json otimizado)');
console.log('- vercel-optimized.json (vercel.json otimizado)');
console.log('');
console.log('📋 Para usar no Vercel:');
console.log('1. Renomeie package.json para package-backup.json');
console.log('2. Renomeie package-vercel.json para package.json');
console.log('3. Renomeie vercel.json para vercel-backup.json');
console.log('4. Renomeie vercel-optimized.json para vercel.json');
console.log('5. Faça commit e push');
