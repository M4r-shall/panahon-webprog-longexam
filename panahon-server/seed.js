/**
 * Seeds the Bulldogs Exchange database with a demo catalog and two accounts.
 *
 *   npm run seed
 *
 * This wipes the categories, products, users, reviews, carts, and orders
 * collections first, so it is safe to re-run before a demo.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ override: true });

const Category = require('./Models/categoryModel');
const Product = require('./Models/productModel');
const User = require('./Models/userModel');
const Review = require('./Models/reviewModel');
const Cart = require('./Models/cartModel');
const Order = require('./Models/orderModel');

const categories = [
    { categoryName: 'Bags', description: 'Totes, backpacks, and carry-alls for campus.' },
    { categoryName: 'Stationery', description: 'Notebooks, pens, and daily class supplies.' },
    { categoryName: 'Drinkware', description: 'Tumblers and bottles for long school days.' },
    { categoryName: 'Tech', description: 'Small gadgets for study and dorm desks.' },
    { categoryName: 'Apparel', description: 'Campus wear and NU merchandise.' },
    { categoryName: 'Workspace', description: 'Desk tools and organizers.' },
    { categoryName: 'Accessories', description: 'Lanyards, holders, and everyday extras.' },
    { categoryName: 'Bundles', description: 'Curated packs bundled at a lower price.' },
];

const products = [
    {
        productName: 'Campus Tote Bag',
        category: 'Bags',
        price: 499,
        stockQuantity: 24,
        imageUrl: '/img/tote_bag.png',
        description:
            'A roomy everyday tote for books, gym clothes, chargers, and quick campus errands. Made with thick canvas, reinforced handles, and a clean monochrome print. Best for students who want one simple carry-all bag for class and after-class plans.',
    },
    {
        productName: 'Daily Notes Pack',
        category: 'Stationery',
        price: 249,
        stockQuantity: 40,
        imageUrl: '/img/daily_notes_pack.png',
        description:
            'A practical bundle of notebooks, sticky notes, and quick-label tabs for daily class work. The set is light, compact, and easy to keep inside a backpack or locker. Useful for lectures, reminders, project lists, and exam review schedules.',
    },
    {
        productName: 'Stainless Tumbler',
        category: 'Drinkware',
        price: 599,
        stockQuantity: 6,
        imageUrl: '/img/stainless_tumbler.png',
        description:
            'A double-wall tumbler built for water, coffee, or tea during long school days. The matte finish keeps the look simple while the lid helps reduce spills in your bag. Fits most side pockets and keeps drinks ready between classes.',
    },
    {
        productName: 'Wireless Study Lamp',
        category: 'Tech',
        price: 899,
        stockQuantity: 15,
        imageUrl: '/img/wireless_study_lamp.png',
        description:
            'A compact rechargeable lamp for dorm desks, night study sessions, and small workspaces. It has three brightness levels and a foldable body that stores neatly after use. Good for reading, writing, and focused desk work without taking too much space.',
    },
    {
        productName: 'Hoodie Jacket',
        category: 'Apparel',
        price: 1199,
        stockQuantity: 10,
        imageUrl: '/img/hoodie_jacket.png',
        description:
            'A soft everyday hoodie with a relaxed fit for classrooms, commute days, and weekends. The heavy cotton blend keeps structure while staying comfortable for regular wear. Available in standard campus sizes.',
    },
    {
        productName: 'Desk Organizer Kit',
        category: 'Workspace',
        price: 349,
        stockQuantity: 18,
        imageUrl: '/img/desk_organizer_kit.png',
        description:
            'A small organizer set for pens, clips, cables, cards, and other desk essentials. The modular pieces can be arranged based on your study area or dorm table. Keeps daily tools visible without adding clutter.',
    },
    {
        productName: 'ID Lanyard Set',
        category: 'Accessories',
        price: 179,
        stockQuantity: 60,
        imageUrl: '/img/lanyard.png',
        description:
            'A durable lanyard and card holder set for IDs, access cards, and small passes. The clip is easy to detach when scanning or presenting credentials. Simple enough for daily use and sturdy enough for a full semester.',
    },
    {
        productName: 'Exam Week Care Pack',
        category: 'Bundles',
        price: 399,
        stockQuantity: 30,
        imageUrl: '/img/exam_week_care_pack.png',
        description:
            'A compact bundle with snacks, tabs, pens, and quick notes for busy review weeks. Packed for convenience so students can grab one kit and focus on studying. Ideal as a personal prep item or a small gift for classmates.',
    },
];

const accounts = [
    {
        name: 'Marius Panahon',
        email: 'admin@nu.edu.ph',
        password: 'Admin123!',
        role: 'Admin',
        address: 'NU Manila, Sampaloc',
    },
    {
        name: 'Juan Dela Cruz',
        email: 'student@nu.edu.ph',
        password: 'Student123!',
        role: 'Customer',
        address: 'Block 4 Lot 12, Quezon City',
    },
    {
        name: 'Maria Santos',
        email: 'maria@nu.edu.ph',
        password: 'Student123!',
        role: 'Customer',
        address: 'Espana Blvd, Manila',
    },
];

const seed = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is missing from panahon-server/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    await Promise.all([
        Category.deleteMany({}),
        Product.deleteMany({}),
        User.deleteMany({}),
        Review.deleteMany({}),
        Cart.deleteMany({}),
        Order.deleteMany({}),
    ]);
    console.log('Cleared existing collections');

    const savedCategories = await Category.insertMany(categories);
    const categoryByName = Object.fromEntries(
        savedCategories.map((category) => [category.categoryName, category._id])
    );
    console.log(`Inserted ${savedCategories.length} categories`);

    const savedUsers = await User.insertMany(
        await Promise.all(
            accounts.map(async (account) => ({
                ...account,
                password: await bcrypt.hash(account.password, 10),
                isActive: true,
            }))
        )
    );
    const admin = savedUsers.find((user) => user.role === 'Admin');
    const [, customer, secondCustomer] = savedUsers;
    console.log(`Inserted ${savedUsers.length} users`);

    const savedProducts = await Product.insertMany(
        products.map((product) => ({
            ...product,
            category: categoryByName[product.category],
            seller: admin._id,
        }))
    );
    console.log(`Inserted ${savedProducts.length} products`);

    const findProduct = (name) => savedProducts.find((p) => p.productName === name)._id;

    await Review.insertMany([
        {
            product: findProduct('Campus Tote Bag'),
            user: customer._id,
            rating: 5,
            comment: 'Very sturdy tote. It fits my laptop and two notebooks with room to spare.',
        },
        {
            product: findProduct('Campus Tote Bag'),
            user: secondCustomer._id,
            rating: 4,
            comment: 'Good quality canvas, though I wish it had an inner pocket for my phone.',
        },
        {
            product: findProduct('Stainless Tumbler'),
            user: customer._id,
            rating: 5,
            comment: 'Keeps my coffee warm from my 7am class all the way to lunch break.',
        },
    ]);
    console.log('Inserted 3 sample reviews');

    console.log('\nSeed complete. Demo accounts:');
    console.log('  Admin    -> admin@nu.edu.ph   / Admin123!');
    console.log('  Customer -> student@nu.edu.ph / Student123!');
    console.log('  Customer -> maria@nu.edu.ph   / Student123!');

    await mongoose.disconnect();
};

seed()
    .then(() => process.exit(0))
    .catch(async (error) => {
        console.error('Seed failed:', error.message);
        await mongoose.disconnect().catch(() => {});
        process.exit(1);
    });
