const Cart = {
    key: 'zishaan_cart',

    getItems: function () {
        return JSON.parse(localStorage.getItem(this.key)) || [];
    },

    addItem: function (product) {
        let items = this.getItems();
        const existingItem = items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            items.push({ ...product, quantity: 1 });
        }

        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateCartCount();
        alert('Product added to cart!');
    },

    removeItem: function (productId) {
        let items = this.getItems();
        items = items.filter(item => item.id !== productId);
        localStorage.setItem(this.key, JSON.stringify(items));
        this.updateCartCount();
        return items; // Return for UI update
    },

    updateQuantity: function (productId, quantity) {
        let items = this.getItems();
        const item = items.find(i => i.id === productId);
        if (item) {
            item.quantity = parseInt(quantity);
            if (item.quantity <= 0) {
                return this.removeItem(productId);
            }
            localStorage.setItem(this.key, JSON.stringify(items));
        }
        this.updateCartCount();
        return items;
    },

    clearCart: function () {
        localStorage.removeItem(this.key);
        this.updateCartCount();
    },

    getTotal: function () {
        const items = this.getItems();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    updateCartCount: function () {
        const countElement = document.querySelector('.cart-count');
        if (countElement) {
            const items = this.getItems();
            const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
            countElement.textContent = totalCount;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Cart.updateCartCount();
});
