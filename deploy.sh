#!/bin/bash

# Script de despliegue para GitHub Pages
# Ejecuta esto para subir tu Teleprompter Pro a GitHub

echo "📺 Teleprompter Pro - Deploy a GitHub Pages"
echo "============================================"
echo ""

# Verificar si hay un remote configurado
if ! git remote get-url origin &>/dev/null; then
    echo "❌ No hay repositorio remoto configurado"
    echo ""
    echo "Sigue estos pasos:"
    echo ""
    echo "1. Crea un repositorio en GitHub:"
    echo "   - Ve a https://github.com/new"
    echo "   - Nombre: teleprompter-app"
    echo "   - Déjalo público"
    echo "   - NO inicialices con README (.gitignore, license)"
    echo ""
    echo "2. Agrega el remote (reemplaza TU_USUARIO con tu username):"
    echo "   git remote add origin https://github.com/TU_USUARIO/teleprompter-app.git"
    echo ""
    echo "3. Ejecuta este script de nuevo:"
    echo "   ./deploy.sh"
    echo ""
    exit 1
fi

# Push a GitHub
echo "🚀 Subiendo a GitHub..."
git branch -M main 2>/dev/null || true
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Subido exitosamente!"
    echo ""
    echo "📱 Para activar GitHub Pages:"
    echo "   1. Ve a tu repositorio en GitHub"
    echo "   2. Click en Settings → Pages"
    echo "   3. Source: Deploy from a branch"
    echo "   4. Branch: main / root"
    echo "   5. Click Save"
    echo ""
    echo "🌐 Tu app estará en:"
    echo "   https://TU_USUARIO.github.io/teleprompter-app/"
    echo ""
else
    echo "❌ Error al subir. Verifica tus credenciales de GitHub"
    echo ""
    echo "Si usas autenticación HTTPS, puede que necesites un token:"
    echo "   git remote set-url origin https://TOKEN@github.com/TU_USUARIO/teleprompter-app.git"
fi
