// admin_script.js - Firebase v9 Modular Syntax

// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
    getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc, updateDoc,
    query, orderBy, onSnapshot, serverTimestamp, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED as FIRESTORE_CACHE_SIZE_UNLIMITED
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBNAn4DVnkT2NbSotifPJGPpbqb5Jfw8vw",
    authDomain: "the-store-e8990.firebaseapp.com",
    projectId: "the-store-e8990",
    storageBucket: "the-store-e8990.firebasestorage.app",
    messagingSenderId: "872334553892",
    appId: "1:872334553892:web:7a14c9a95559c5ae5979b1",
    measurementId: "G-N0B35J7RLY"
};

// --- Global Variables ---
let app;
let db;
const ORDER_STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];
const MAX_OTHER_IMAGES = 3; // Number of "other image" input fields in your HTML form

// --- DOM Element Variables (Assigned in assignDomElements) ---
let adminNavButtons, adminProductsSection, adminOrdersSection, adminOverlay,
    adminProductListTbody, adminBtnAddProduct, adminProductFormPopup, adminProductForm,
    adminProductFormTitle, adminBtnCancelForm, adminProductFirestoreIdField,
    adminProductCustomIdField, adminProductTitleField, adminProductDescriptionField,
    adminProductCategoryField, adminProductPriceField, adminProductStockField,
    adminProductRatingField, adminProductImageField, adminProductImagePreview,
    adminProductTagsField, adminOrderListTbody,
    // Array to hold "other image" input field elements
    adminProductOtherImageFields = [],
    adminProductRupeesConverted; // Add this to your DOM element variables

// --- Utility Functions ---
function escapeHtml(text) {
  if (text === null || typeof text === 'undefined') return '';
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayGlobalError(message) { console.error("GLOBAL ADMIN ERROR:", message); alert(message); }

function showImagePreview(url) {
    if (!adminProductImagePreview) return;
    if (url) {
        try { new URL(url); adminProductImagePreview.src = url; adminProductImagePreview.style.display = 'block'; }
        catch (_) { adminProductImagePreview.style.display = 'none'; adminProductImagePreview.src = '#'; /* console.warn("Invalid URL for image preview:", url); */ }
    } else { adminProductImagePreview.style.display = 'none'; adminProductImagePreview.src = '#'; }
}

function togglePopup(formPopupElement, show) {
    if (!formPopupElement || !adminOverlay) { console.warn("togglePopup: formPopup or overlay element not found."); return; }
    const triggerButton = adminBtnAddProduct; // Assuming product form for now
    if (show) {
        adminOverlay.classList.add('active'); formPopupElement.classList.add('active'); formPopupElement.setAttribute('aria-hidden', 'false');
        if (triggerButton) triggerButton.setAttribute('aria-expanded', 'true');
        const firstFocusable = formPopupElement.querySelector('input:not([type="hidden"]), select, textarea, button');
        if (firstFocusable) firstFocusable.focus();
    } else {
        adminOverlay.classList.remove('active'); formPopupElement.classList.remove('active'); formPopupElement.setAttribute('aria-hidden', 'true');
        if (triggerButton) {
            triggerButton.setAttribute('aria-expanded', 'false');
            // Return focus only if an element within the popup had focus before closing
            if (formPopupElement.contains(document.activeElement)) { triggerButton.focus(); }
        }
    }
}

function resetProductForm() {
    if (adminProductForm) adminProductForm.reset();
    showImagePreview('');
    if (adminProductFirestoreIdField) adminProductFirestoreIdField.value = '';
    if (adminProductFormTitle) adminProductFormTitle.textContent = 'Add New Product';
    // Clear "Other Image" input fields
    adminProductOtherImageFields.forEach(field => {
        if (field) field.value = '';
    });
}

// --- Firebase Initialization ---
function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        // console.log("Admin Script: Firebase App & Firestore Initialized (v9).");
        enableIndexedDbPersistence(db, { cacheSizeBytes: FIRESTORE_CACHE_SIZE_UNLIMITED })
            // .then(() => console.log("Admin Script: Firestore persistence enabled (v9)."))
            .catch((err) => {
                if (err.code === 'failed-precondition') { console.warn("Admin Script: Firestore persistence (v9) failed (multiple tabs may be open or IndexedDB is not supported well)."); }
                else if (err.code === 'unimplemented') { console.warn("Admin Script: Firestore persistence (v9) not available/supported in this browser."); }
                else { console.error("Admin Script: Error enabling Firestore persistence (v9):", err); }
            });
        return true;
    } catch (error) {
        console.error("Admin Script: CRITICAL FIREBASE INIT ERROR (v9):", error);
        displayGlobalError("Firebase could not be initialized. Admin panel functions will fail. Please check the console and your Firebase configuration.");
        if (adminBtnAddProduct) adminBtnAddProduct.disabled = true;
        if (adminNavButtons && adminNavButtons.length > 0) adminNavButtons.forEach(btn => btn.disabled = true);
        return false;
    }
}

// --- DOM Element Assignment ---
function assignDomElements() {
    adminNavButtons = [...document.querySelectorAll('.admin-nav-btn')];
    adminProductsSection = document.getElementById('admin-products-section');
    adminOrdersSection = document.getElementById('admin-orders-section');
    adminOverlay = document.getElementById('admin-overlay');
    adminProductListTbody = document.getElementById('admin-product-list-tbody');
    adminBtnAddProduct = document.getElementById('admin-btn-add-product');
    adminProductFormPopup = document.getElementById('admin-product-form-popup');
    adminProductForm = document.getElementById('admin-product-form');
    if (adminProductFormPopup) { adminProductFormTitle = adminProductFormPopup.querySelector('h2'); }
    adminBtnCancelForm = document.getElementById('admin-btn-cancel-form');
    adminProductFirestoreIdField = document.getElementById('admin-product-firestore-id-field');
    adminProductCustomIdField = document.getElementById('admin-product-custom-id-field');
    adminProductTitleField = document.getElementById('admin-product-title-field');
    adminProductDescriptionField = document.getElementById('admin-product-description-field');
    adminProductCategoryField = document.getElementById('admin-product-category-field');
    adminProductPriceField = document.getElementById('admin-product-price-field');
    adminProductStockField = document.getElementById('admin-product-stock-field');
    adminProductRatingField = document.getElementById('admin-product-rating-field');
    adminProductImageField = document.getElementById('admin-product-image-field');
    adminProductImagePreview = document.getElementById('admin-image-preview');
    adminProductTagsField = document.getElementById('admin-product-tags-field');
    adminOrderListTbody = document.getElementById('admin-order-list-tbody');

    // Assign "Other Image" input fields to the array
    adminProductOtherImageFields = []; // Clear it first
    for (let i = 1; i <= MAX_OTHER_IMAGES; i++) {
        const field = document.getElementById(`admin-product-other-image-${i}`);
        if (field) {
            adminProductOtherImageFields.push(field);
        } else {
            // This warning can be noisy if you intentionally have fewer than MAX_OTHER_IMAGES fields defined
            // console.warn(`Other image field admin-product-other-image-${i} not found in the HTML.`);
        }
    }
    adminProductRupeesConverted = document.getElementById('admin-rupees-converted');

    if (!adminNavButtons.length || !adminProductsSection || !adminOrdersSection || !adminProductListTbody || !adminOrderListTbody || !adminProductFormPopup || !adminProductForm ) {
        console.warn("Admin Script: Some core UI elements were not found. Navigation or forms might not work as expected.");
    }
}

// --- Product Management ---
function renderAdminProductsTable(products) {
    if (!adminProductListTbody) { console.error("renderAdminProductsTable: Missing table body for products."); return; }
    adminProductListTbody.innerHTML = '';
    if (!products || products.length === 0) {
        adminProductListTbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#777;">No products found. Use "+ Add New Product" to add some.</td></tr>';
        return;
    }
    products.forEach(product => {
        const tr = document.createElement('tr');
        const otherImagesCount = (product.otherImages && Array.isArray(product.otherImages)) ? product.otherImages.length : 0;
        tr.innerHTML = `
            <td>${escapeHtml(product.firestoreDocId ? product.firestoreDocId.substring(0, 8) + '...' : 'N/A')}</td>
            <td>${escapeHtml(product.customId || 'N/A')}</td>
            <td>${escapeHtml(product.title || 'Untitled Product')}</td>
            <td>${escapeHtml(product.category || 'N/A')}</td>
            <td>${Number(product.price || 0).toFixed(2)}</td>
            <td>${Number(product.rating || 0).toFixed(1)}</td>
            <td>${escapeHtml(String(product.stock !== undefined ? product.stock : 'N/A'))}</td>
            <td><img src="${escapeHtml(product.image || product.img || '#')}" alt="${escapeHtml(product.title || 'Product Image')}" loading="lazy" /></td>
            <td>${otherImagesCount}</td> {/* Display count of other images */}
            <td>
                <button class="admin-btn admin-btn-edit admin-btn-sm" data-firestore-id="${product.firestoreDocId}" aria-label="Edit ${escapeHtml(product.title || '')}">Edit</button>
                <button class="admin-btn admin-btn-delete admin-btn-sm" data-firestore-id="${product.firestoreDocId}" aria-label="Delete ${escapeHtml(product.title || '')}">Delete</button>
            </td>`;
        adminProductListTbody.appendChild(tr);
    });
}

function openAdminProductForm(productToEdit = null) {
    if (!adminProductFormPopup) { console.error("openAdminProductForm: Product form popup not found."); return; }
    resetProductForm(); // Also sets title to "Add New Product"

    if (productToEdit) {
        if (adminProductFormTitle) adminProductFormTitle.textContent = 'Edit Product';
        if(adminProductFirestoreIdField) adminProductFirestoreIdField.value = productToEdit.firestoreDocId || '';
        if(adminProductCustomIdField) adminProductCustomIdField.value = productToEdit.customId || '';
        if(adminProductTitleField) adminProductTitleField.value = productToEdit.title || '';
        if(adminProductDescriptionField) adminProductDescriptionField.value = productToEdit.description || '';
        if(adminProductCategoryField) adminProductCategoryField.value = productToEdit.category || '';
        if(adminProductPriceField) adminProductPriceField.value = productToEdit.price !== undefined ? String(productToEdit.price) : '';
        if(adminProductStockField) adminProductStockField.value = productToEdit.stock !== undefined ? String(productToEdit.stock) : '';
        if(adminProductRatingField) adminProductRatingField.value = productToEdit.rating !== undefined ? String(productToEdit.rating) : '';
        if(adminProductImageField) adminProductImageField.value = productToEdit.image || productToEdit.img || ''; // Check both
        if(adminProductTagsField) adminProductTagsField.value = Array.isArray(productToEdit.tags) ? productToEdit.tags.join(', ') : (productToEdit.tags || '');
        
        const mainImageSrc = productToEdit.image || productToEdit.img;
        if (mainImageSrc) showImagePreview(mainImageSrc);

        // Populate "Other Image" input fields
        if (productToEdit.otherImages && Array.isArray(productToEdit.otherImages)) {
            productToEdit.otherImages.forEach((url, index) => {
                if (index < adminProductOtherImageFields.length && adminProductOtherImageFields[index]) {
                    adminProductOtherImageFields[index].value = url;
                }
            });
        }
    }
    togglePopup(adminProductFormPopup, true);
}

async function handleProductFormSubmit(e) {
    e.preventDefault();
    if (!db) { displayGlobalError("Database not initialized. Cannot save product."); return; }
    if (!adminProductForm || !adminProductForm.checkValidity()) {
        if (adminProductForm) adminProductForm.reportValidity();
        else console.error("handleProductFormSubmit: Product form not found.");
        return;
    }

    const firestoreDocIdToEdit = adminProductFirestoreIdField ? adminProductFirestoreIdField.value : null;
    const customId = adminProductCustomIdField ? adminProductCustomIdField.value.trim() : ""; // Default to empty string if not present
    const title = adminProductTitleField ? adminProductTitleField.value.trim() : '';
    const description = adminProductDescriptionField ? adminProductDescriptionField.value.trim() : '';
    const category = adminProductCategoryField ? adminProductCategoryField.value : '';
    const price = adminProductPriceField ? parseFloat(adminProductPriceField.value) : 0;
    const stock = adminProductStockField ? parseInt(adminProductStockField.value, 10) : 0;
    const rating = adminProductRatingField ? parseFloat(adminProductRatingField.value) : 0;
    const image = adminProductImageField ? adminProductImageField.value.trim() : '';
    const tagsArray = adminProductTagsField ? adminProductTagsField.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Collect URLs from "Other Image" input fields
    const otherImages = adminProductOtherImageFields
        .map(field => field ? field.value.trim() : "") // Handle if a field wasn't found
        .filter(url => url); // Only include non-empty URLs

    if (!title || !description || !category || isNaN(price) || price < 0 || isNaN(stock) || stock < 0 || isNaN(rating) || rating < 0 || rating > 5 || !image) {
        alert("Please fill all required (*) fields correctly.\nPrice/Stock must be 0 or greater.\nRating must be between 0 and 5.");
        return;
    }

    const productData = {
        title, description, category, price, stock, rating, image,
        otherImages: otherImages, // Add the array of other image URLs
        tags: tagsArray,
        lastUpdated: serverTimestamp()
    };
    // Only include customId if it has a value
    if (customId) {
        productData.customId = customId;
    }
    // If this customId is also meant to be the primary 'id' for your store app, set it.
    // The main store's findProductById currently uses product.id which defaults to firestoreDocId or customId if present.
    // If customId IS your primary key, then ensure it's set as `id` field for consistency.
    if (customId) {
        productData.id = customId;
    }


    const saveButton = adminProductForm ? adminProductForm.querySelector('button[type="submit"]') : null;

    try {
        if (saveButton) saveButton.disabled = true;
        if (firestoreDocIdToEdit) {
            const productRef = doc(db, "products", firestoreDocIdToEdit);
            await setDoc(productRef, productData, { merge: true }); // Use setDoc with merge for updates
            alert("Product updated successfully!");
        } else {
            // For new products, Firestore generates its own doc ID.
            // If you want your customId to also be stored as the 'id' field for easier querying in main app:
            // This 'id' is different from Firestore's document ID.
            if (productData.customId && !productData.id) {
                 productData.id = productData.customId;
            }
            const productsColRef = collection(db, "products");
            const docRef = await addDoc(productsColRef, productData);
            alert(`Product added successfully! (Firestore ID: ${docRef.id})`);
        }
        if(adminProductFormPopup) togglePopup(adminProductFormPopup, false);
    } catch (error) {
        console.error("Error saving product to Firestore (v9):", error);
        displayGlobalError(`Error saving product: ${error.message}. Check console.`);
    } finally {
        if (saveButton) saveButton.disabled = false;
    }
}

async function handleProductTableActions(e) {
    if (!db) { displayGlobalError("Database not initialized. Cannot perform action."); return; }
    const target = e.target.closest('.admin-btn-edit, .admin-btn-delete');
    if (!target) return;
    const firestoreDocId = target.dataset.firestoreId;
    if (!firestoreDocId) { console.warn("Action button clicked, but no firestore-id found on the button."); return; }

    if (target.classList.contains('admin-btn-edit')) {
        try {
            const productRef = doc(db, "products", firestoreDocId);
            const docSnap = await getDoc(productRef);
            if (docSnap.exists()) {
                openAdminProductForm({ firestoreDocId: docSnap.id, ...docSnap.data() });
            } else {
                displayGlobalError("Product not found for editing. It might have been deleted.");
            }
        } catch (error) {
            console.error("Error fetching product for edit (v9):", error);
            displayGlobalError("Error fetching product details for edit.");
        }
    } else if (target.classList.contains('admin-btn-delete')) {
        if (confirm(`Are you sure you want to delete product "${target.getAttribute('aria-label').replace('Delete ', '')}" (ID: ${firestoreDocId})? This action cannot be undone.`)) {
            try {
                const productRef = doc(db, "products", firestoreDocId);
                await deleteDoc(productRef);
                alert("Product deleted successfully!");
            } catch (error) {
                console.error("Error deleting product from Firestore (v9):", error);
                displayGlobalError("Error deleting product.");
            }
        }
    }
}

// --- Order Management ---
function renderAdminOrdersTable(orders) {
    if (!adminOrderListTbody) { console.warn("renderAdminOrdersTable: Missing table body for orders."); return; }
    adminOrderListTbody.innerHTML = '';
    if (!orders || orders.length === 0) {
        adminOrderListTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:#777;">No orders found.</td></tr>';
        return;
    }
    orders.forEach(order => {
        const tr = document.createElement('tr');
        const itemsData = order.items || [];
        const itemsSummary = itemsData.map(item => `${escapeHtml(item.title || item.name || 'Unknown Item')} (x${item.quantity || 1})`).join('<br>');
        const shipping = order.shippingDetails || order.customerInfo || {};
        const total = order.totalAmount !== undefined ? order.totalAmount : (order.total !== undefined ? order.total : 0);
        let statusOptionsHtml = ORDER_STATUSES.map(status => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`).join('');
        const statusDropdown = `<select class="admin-order-status-dropdown" data-firestore-order-id="${order.firestoreDocId}" aria-label="Status for order ${escapeHtml(order.orderId || order.firestoreDocId)}">${statusOptionsHtml}</select>`;
        tr.innerHTML = `
            <td>${escapeHtml(order.orderId || (order.firestoreDocId ? order.firestoreDocId.substring(0, 8) + '...' : 'N/A'))}</td>
            <td>${escapeHtml(shipping.name || 'N/A')}</td>
            <td>${escapeHtml(order.userEmail || shipping.email || 'N/A')}</td>
            <td>${escapeHtml(shipping.address || 'N/A')}</td>
            <td>${escapeHtml(shipping.city || 'N/A')}</td>
            <td>${escapeHtml(shipping.postal || shipping.postalCode || 'N/A')}</td>
            <td>${escapeHtml(shipping.phone || 'N/A')}</td>
            <td>${Number(total).toFixed(2)}</td>
            <td>${escapeHtml(order.paymentMethodDisplay || order.paymentMethod || 'N/A')}</td>
            <td class="order-items-cell">${itemsSummary || 'No items listed'}</td>
            <td>${statusDropdown}</td>`;
        adminOrderListTbody.appendChild(tr);
    });
}

async function handleOrderStatusChange(event) {
    const selectElement = event.target;
    if (selectElement.classList.contains('admin-order-status-dropdown')) {
        if (!db) { displayGlobalError("Database not ready. Cannot update order status."); return; }
        const firestoreOrderId = selectElement.dataset.firestoreOrderId;
        const newStatus = selectElement.value;
        if (!firestoreOrderId) { console.error("Firestore Order ID not found on status dropdown."); return; }
        try {
            const orderRef = doc(db, "orders", firestoreOrderId);
            await updateDoc(orderRef, {
                status: newStatus,
                lastUpdatedAdmin: serverTimestamp() // Good practice to track admin updates
            });
            // No alert needed, visual change is confirmation
        } catch (error) {
            console.error("Error updating order status in Firestore (v9):", error);
            displayGlobalError("Failed to update order status. Please try again.");
            // Optionally revert dropdown if update fails
            // const order = (await getDoc(orderRef)).data();
            // selectElement.value = order.status;
        }
    }
}

// --- Realtime Listeners Setup ---
let productsUnsubscribe = null;
let ordersUnsubscribe = null;

function setupProductsListener() {
    if (!db) { console.error("setupProductsListener: db not initialized."); return; }
    if (productsUnsubscribe) { productsUnsubscribe(); /* console.log("Previous products listener detached."); */ }
    try {
        const productsQuery = query(collection(db, "products"), orderBy("title")); // Or orderBy("lastUpdated", "desc")
        productsUnsubscribe = onSnapshot(productsQuery, (snapshot) => {
            const products = [];
            snapshot.forEach((doc) => products.push({ firestoreDocId: doc.id, ...doc.data() }));
            renderAdminProductsTable(products);
            // console.log(`Admin Script: Products listener update. ${products.length} products rendered.`);
        }, (error) => {
            console.error("Admin Script: Error with realtime products listener (v9):", error);
            if (adminProductListTbody) adminProductListTbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Error loading products. Check console.</td></tr>';
        });
    } catch (error) {
        console.error("Error setting up products listener (v9):", error);
        if (adminProductListTbody) adminProductListTbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">Failed to setup products listener. Check console.</td></tr>';
    }
}

function setupOrdersListener() {
    if (!db) { console.error("setupOrdersListener: db not initialized."); return; }
    if (ordersUnsubscribe) { ordersUnsubscribe(); /* console.log("Previous orders listener detached."); */ }
    try {
        const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc")); // Make sure 'timestamp' field exists for ordering
        ordersUnsubscribe = onSnapshot(ordersQuery, (snapshot) => {
            const orders = [];
            snapshot.forEach((doc) => {
                orders.push({ firestoreDocId: doc.id, ...doc.data() });
            });
            renderAdminOrdersTable(orders);
            // console.log(`Admin Script: Orders listener update. ${orders.length} orders rendered.`);
        }, (error) => {
            console.error("Admin Script: Error with realtime orders listener (v9):", error);
            if (adminOrderListTbody) adminOrderListTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">Error loading orders. Check console.</td></tr>';
        });
    } catch (error) {
        console.error("Error setting up orders listener (v9):", error);
        if (adminOrderListTbody) adminOrderListTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">Failed to setup orders listener. Check console.</td></tr>';
    }
}

// --- Currency Converter Logic ---
function updateRupeesConverted() {
    if (!adminProductPriceField || !adminProductRupeesConverted) return;
    const usd = parseFloat(adminProductPriceField.value);
    const rate = 83; // 1 USD = 83 INR (update as needed)
    if (!isNaN(usd)) {
        adminProductRupeesConverted.textContent = Math.round(usd * rate);
    } else {
        adminProductRupeesConverted.textContent = '0';
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    if (!adminNavButtons || !adminProductFormPopup || !adminProductForm) {
        // console.warn("setupEventListeners: Some core DOM elements are missing, not all event listeners will be attached.");
    }

    if (adminNavButtons && adminNavButtons.length > 0) {
        adminNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                adminNavButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
                btn.classList.add('active'); btn.setAttribute('aria-selected', 'true');
                const targetSectionId = btn.getAttribute('aria-controls');

                if (adminProductsSection) adminProductsSection.hidden = (targetSectionId !== 'admin-products-section');
                if (adminOrdersSection) adminOrdersSection.hidden = (targetSectionId !== 'admin-orders-section');

                // Detach the listener for the non-active tab and attach/reattach for the active one
                if (targetSectionId === 'admin-products-section') {
                    if (ordersUnsubscribe) { ordersUnsubscribe(); ordersUnsubscribe = null; /* console.log("Orders listener explicitly detached."); */ }
                    if(!productsUnsubscribe) setupProductsListener(); // Only setup if not already active
                } else if (targetSectionId === 'admin-orders-section') {
                    if (productsUnsubscribe) { productsUnsubscribe(); productsUnsubscribe = null; /* console.log("Products listener explicitly detached."); */ }
                    if(!ordersUnsubscribe) setupOrdersListener(); // Only setup if not already active
                }
            });
        });
    } else { /* console.warn("No navigation buttons found."); */ }

    if (adminBtnAddProduct) {
        adminBtnAddProduct.addEventListener('click', () => openAdminProductForm());
    }
    if (adminBtnCancelForm && adminProductFormPopup) {
        adminBtnCancelForm.addEventListener('click', () => togglePopup(adminProductFormPopup, false));
    }
    if (adminProductForm) {
        adminProductForm.addEventListener('submit', handleProductFormSubmit);
    } else { /* console.warn("Product form not found, submit listener not attached."); */ }

    if (adminProductListTbody) {
        adminProductListTbody.addEventListener('click', handleProductTableActions);
    }
    if (adminProductImageField) {
        adminProductImageField.addEventListener('input', () => showImagePreview(adminProductImageField.value));
        adminProductImageField.addEventListener('change', () => showImagePreview(adminProductImageField.value)); // For pasting
    }
    if (adminOrderListTbody) {
        adminOrderListTbody.addEventListener('change', handleOrderStatusChange);
    }
    if (adminOverlay) {
        adminOverlay.addEventListener('click', () => {
            if (adminProductFormPopup && adminProductFormPopup.classList.contains('active')) {
                togglePopup(adminProductFormPopup, false);
            }
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (adminProductFormPopup && adminProductFormPopup.classList.contains('active')) {
                togglePopup(adminProductFormPopup, false);
            }
        }
    });

    if (adminProductPriceField && adminProductRupeesConverted) {
        adminProductPriceField.addEventListener('input', updateRupeesConverted);
    }
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    assignDomElements(); // Get references to all DOM elements first
    // console.log("Admin Dashboard DOMContentLoaded. Attempting to initialize Firebase (v9)...");

    if (initializeFirebase()) {
        // console.log("Firebase initialized successfully. Setting up event listeners and default view.");
        setupEventListeners(); // Then setup UI event listeners

        // Activate the default tab (Products) and load its data
        if (adminNavButtons && adminNavButtons.length > 0) {
            const defaultActiveButton = adminNavButtons.find(btn => btn.classList.contains('active')) || adminNavButtons[0];
            if (defaultActiveButton && typeof defaultActiveButton.click === 'function') {
                defaultActiveButton.click(); // This click will trigger setupProductsListener via the nav logic
            } else {
                // Fallback if no button is marked active or click doesn't work
                // console.warn("No default active navigation button could be clicked. Manually setting up products listener if section is visible.");
                if (adminProductsSection && (typeof adminProductsSection.hidden === 'undefined' || adminProductsSection.hidden === false)) {
                    setupProductsListener();
                }
            }
        } else {
            // Fallback if no nav buttons at all
            // console.warn("No navigation buttons found. Manually setting up products listener if section is visible.");
            if (adminProductsSection && (typeof adminProductsSection.hidden === 'undefined' || adminProductsSection.hidden === false)) {
                setupProductsListener();
            }
        }
    } else {
        console.error("Firebase initialization failed. Admin panel may not function correctly.");
        if (adminProductListTbody) adminProductListTbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:red;">DATABASE CONNECTION FAILED. PRODUCTS CANNOT BE LOADED.</td></tr>';
        if (adminOrderListTbody) adminOrderListTbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:red;">DATABASE CONNECTION FAILED. ORDERS CANNOT BE LOADED.</td></tr>';
    }
});