# Точка входа сайта. Запуск: python app.py
from flask import Flask, render_template, request

from products import PRODUCTS, get_product, search_products

app = Flask(__name__)


@app.template_filter("price")
def format_price(value):
    """Красиво показывает цену: 4900 -> «4 900 ₽»."""
    return f"{value:,}".replace(",", " ") + " ₽"


@app.route("/")
def index():
    """Главная страница: подборка из 7 карточек товаров."""
    featured = PRODUCTS[:7]
    return render_template("index.html", products=featured, active="home")


@app.route("/catalog")
def catalog():
    """Полный каталог всех товаров."""
    return render_template("catalog.html", products=PRODUCTS, active="catalog")


@app.route("/about")
def about():
    """Страница «О нас»."""
    return render_template("about.html", active="about")


@app.route("/product/<int:product_id>")
def product(product_id):
    """Отдельная карточка товара."""
    item = get_product(product_id)
    if item is None:
        return render_template("not_found.html"), 404

    similar = [
        p for p in PRODUCTS
        if p["category"] == item["category"] and p["id"] != item["id"]
    ]
    others = [p for p in PRODUCTS if p["id"] != item["id"] and p not in similar]
    similar = (similar + others)[:3]

    return render_template("product.html", item=item, similar=similar)


@app.route("/search")
def search():
    """Поиск по товарам: /search?query=кольцо"""
    query = request.args.get("query", "")
    results = search_products(query)
    return render_template("search.html", query=query, results=results)


@app.route("/cart")
def cart():
    """Корзина. Содержимое корзины браузер хранит сам (localStorage)."""
    return render_template("cart.html")


@app.route("/account")
def account():
    """Личный кабинет — заглушка с формой входа."""
    return render_template("account.html")


@app.errorhandler(404)
def page_not_found(error):
    return render_template("not_found.html"), 404


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
