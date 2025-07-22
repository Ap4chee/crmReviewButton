# Skrypt który ma być na stronie klienta: [link](https://github.com/Ap4chee/crmReviewButton/blob/main/resources/js/ScreenshotScript.js)

## 🔧 Instalacja i uruchomienie

```bash
git clone https://github.com/Ap4chee/crmReviewButton
cd twojerepo

composer install
npm install

cp .env.example .env
# Ustaw w .env dane bazy:
# DB_DATABASE=twojabaza
# DB_USERNAME=root
# DB_PASSWORD=

php artisan key:generate
php artisan migrate

# Uruchomienie serwera Laravel:
php artisan serve
# Domyślnie: http://127.0.0.1:8000

# Uruchomienie frontendu (Inertia/React/TypeScript):
npm run dev
