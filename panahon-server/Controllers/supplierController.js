const Supplier = require('../Models/supplierModel');
const { HttpStatus } = require('../config/constants');
const { failServer, failValidation } = require('../Middleware/errorHandler');

const duplicateName = (res) => res.status(HttpStatus.CONFLICT).json({
    success: false,
    message: 'A supplier with that name already exists.'
});

exports.getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await Supplier.find().sort({ supplierName: 1 });
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Suppliers retrieved successfully.',
            count: suppliers.length,
            data: suppliers
        });
    } catch (error) {
        failServer(res, error, 'getAllSuppliers', 'Could not load suppliers. Please try again.');
    }
};

exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Supplier not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Supplier retrieved successfully.',
            data: supplier
        });
    } catch (error) {
        failServer(res, error, 'getSupplierById', 'Could not load the supplier. Please try again.');
    }
};

exports.createSupplier = async (req, res) => {
    try {
        const { supplierName, contactPerson, email, phone, address } = req.body;
        const savedSupplier = await new Supplier({ supplierName, contactPerson, email, phone, address }).save();
        res.status(HttpStatus.CREATED).json({
            success: true,
            message: 'Supplier created successfully.',
            data: savedSupplier
        });
    } catch (error) {
        if (error.code === 11000) return duplicateName(res);
        failValidation(res, error, 'createSupplier', 'The supplier could not be created.');
    }
};

exports.updateSupplier = async (req, res) => {
    try {
        const { supplierName, contactPerson, email, phone, address } = req.body;
        const updated = await Supplier.findByIdAndUpdate(
            req.params.id,
            { supplierName, contactPerson, email, phone, address },
            { new: true, runValidators: true }
        );
        if (!updated) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Supplier not found.' });
        }
        res.status(HttpStatus.OK).json({
            success: true,
            message: 'Supplier updated successfully.',
            data: updated
        });
    } catch (error) {
        if (error.code === 11000) return duplicateName(res);
        failValidation(res, error, 'updateSupplier', 'The supplier could not be updated.');
    }
};

exports.deleteSupplier = async (req, res) => {
    try {
        const deleted = await Supplier.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Supplier not found.' });
        }
        res.status(HttpStatus.OK).json({ success: true, message: 'Supplier deleted successfully.' });
    } catch (error) {
        failServer(res, error, 'deleteSupplier', 'The supplier could not be deleted.');
    }
};
