const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Product = require('../models/Product');
const DeletedProductLog = require('../models/DeletedProductLog');
const DeletedProduct = require('../models/DeletedProduct');
const InactiveProduct = require('../models/InactiveProduct');
const UploadedProduct = require('../models/UploadedProduct');
const authMiddleware = require('../middleware/authMiddleware');
const logActivity = require('../utils/logActivity');

// Helper to normalize strings for space-insensitive search
function normalize(str) {
  return (str || '').toLowerCase().replace(/\s+/g, '');
}

function getSearchableField(fieldPath) {
  return {
    $replaceAll: {
      input: { $toLower: `$${fieldPath}` },
      find: ' ',
      replacement: ''
    }
  };
}

// GET: Get all products (only non-deleted and visible) + uploaded records
router.get('/', async (req, res) => {
  try {
    // Pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search ? req.query.search.trim() : '';
    const skip = (page - 1) * limit;
    const usePagination = req.query.page || req.query.limit || req.query.search;

    // Build filter for main products
    let productFilter = { deleted: { $ne: true }, visible: { $ne: false } };
    if (search) {
      const normalizedSearch = normalize(search);

      const searchableFields = [
        getSearchableField('itemName'),
        getSearchableField('category'),
        getSearchableField('itemCode'),
        getSearchableField('Supplier')
      ];

      const searchableCombined = {
        $reduce: {
          input: searchableFields,
          initialValue: '',
          in: { $concat: ['$$value', '$$this'] }
        }
      };

      productFilter.$or = [
        // Match any individual field
        ...searchableFields.map(field => ({
          $expr: {
            $regexMatch: {
              input: field,
              regex: normalizedSearch,
              options: 'i'
            }
          }
        })),
        // Match across fields (e.g., "phone case" in itemName + category)
        {
          $expr: {
            $regexMatch: {
              input: searchableCombined,
              regex: normalizedSearch,
              options: 'i'
            }
          }
        }
      ];
    }

    // Build filter for uploaded records
    let uploadFilter = {};
    if (search) {
      const normalizedSearch = normalize(search);

      const searchableFields = [
        getSearchableField('data.Item Name'),
        getSearchableField('data.itemName'),
        getSearchableField('data.ItemCode'),
        getSearchableField('data.itemCode'),
        getSearchableField('data.Category'),
        getSearchableField('data.category'),
        getSearchableField('data.Supplier'),
        getSearchableField('data.supplierName')
      ];

      const searchableCombined = {
        $reduce: {
          input: searchableFields,
          initialValue: '',
          in: { $concat: ['$$value', '$$this'] }
        }
      };

      uploadFilter.$or = [
        ...searchableFields.map(field => ({
          $expr: {
            $regexMatch: {
              input: field,
              regex: normalizedSearch,
              options: 'i'
            }
          }
        })),
        {
          $expr: {
            $regexMatch: {
              input: searchableCombined,
              regex: normalizedSearch,
              options: 'i'
            }
          }
        }
      ];
    }

    if (usePagination) {
      // Paginated mode
      const [mainCount, uploadedCount] = await Promise.all([
        Product.countDocuments(productFilter),
        UploadedProduct.countDocuments(uploadFilter)
      ]);
      const total = mainCount + uploadedCount;

      // Fetch paginated main products
      const mainProducts = await Product.find(productFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      // Fetch paginated uploaded records
      const uploadedRecords = await UploadedProduct.find(productFilter)
        .sort({ uploadedAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean();
      // Map uploaded records to product-like objects
      const mappedUploads = uploadedRecords.map((rec) => {
        const d = rec.data || {};
        return {
          itemCode: d['Item Code'] || d['itemCode'] || d['ItemCode'] || '',
          itemName: d['Item Name'] || d['itemName'] || d['ItemName'] || '',
          category: d['Category'] || d['category'] || '',
          buyingPrice: Number(d['Buying Price'] || d['buyingPrice'] || 0),
          sellingPrice: Number(d['Selling Price'] || d['sellingPrice'] || 0),
          stock: Number(d['Stock'] || d['stock'] || 0),
          supplierName: d['Supplier'] || d['supplierName'] || d['SupplierName'] || '',
          createdAt: d['Created At'] || d['createdAt'] || rec.uploadedAt,
          _id: rec._id,
          source: 'uploaded',
          flags: rec.flags || [],
          uploadedBy: rec.uploadedBy || '',
          uploadedAt: rec.uploadedAt
        };
      });

      // Add source: 'main' to main products
      const mainWithSource = mainProducts.map(p => ({ ...p, source: 'main' }));
      // Merge: main products first, then uploaded
      const all = [...mappedUploads, ...mainWithSource];
      res.json({
        records: all,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      });

      console.log("Main Products:");
      console.log(mainProducts);

      console.log("Mapped Uploads:");
      console.log(mappedUploads);

    } else {
      // Old behavior: return all
    const products = await Product.find({
      deleted: { $ne: true },        // not deleted (includes false or missing)
      visible: { $ne: false },      // is visible (includes true or missing)

    }).lean();

    const pipeline = [
          // Step 1: Apply your filters
          {
            $match: {
              deleted: { $ne: true },
              visible: { $ne: false },
              $or: [
                { stock: { $gt: 0 } }
              ]
            }
          },
    
          // Step 2: Sort by uploadedAt descending → newest first
          { $sort: { uploadedAt: -1 } },
    
          // Step 3: Group by the 3 fields to deduplicate
          {
            $group: {
              _id: {
                grnNumber: "$grnNumber",
                itemName: "$itemName",
                category: "$category",
                buyingPrice: "$buyingPrice"
              },
              doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
            }
          },
    
          // Step 4: Promote the full document back
          { $replaceRoot: { newRoot: "$doc" } }
    
          // No pagination: just return all unique docs
        ];
    
        const pipeline2 = [
          // Step 1: Apply your filters
          {
            $match: {
              deleted: { $ne: true },
              visible: { $ne: false },
              stock: { $eq: 0 } 
            }
          },
    
          // Step 2: Sort by uploadedAt descending → newest first
          { $sort: { uploadedAt: -1 } },
    
          // Step 3: Group by the 3 fields to deduplicate
          {
            $group: {
              _id: {
                grnNumber: "$grnNumber",
                itemName: "$itemName",
                category: "$category",
                buyingPrice: "$buyingPrice"
              },
              doc: { $first: "$$ROOT" } // Keep the most recent (due to sort)
            }
          },
    
          // Step 4: Promote the full document back
          { $replaceRoot: { newRoot: "$doc" } }
    
          // No pagination: just return all unique docs
        ];
    
        // Add timeout to avoid hanging
        const uniqueRecords = await Product.aggregate(pipeline)
          // .maxTimeMS(20000) // 20 seconds max
          .exec();
    
        const uniqueRecords2 = await Product.aggregate(pipeline2)
          // .maxTimeMS(20000) // 20 seconds max
          .exec();


      console.log("products", products);
      const uploadedRecords = await UploadedProduct.find().sort({ uploadedAt: 1 }).lean();
      const mappedUploads = uploadedRecords.map((rec) => {
        const d = rec.data || {};
        return {
          itemCode: d['Item Code'] || d['itemCode'] || d['ItemCode'] || '',
          itemName: d['Item Name'] || d['itemName'] || d['ItemName'] || '',
          category: d['Category'] || d['category'] || '',
          buyingPrice: Number(d['Buying Price'] || d['buyingPrice'] || 0),
          sellingPrice: Number(d['Selling Price'] || d['sellingPrice'] || 0),
          stock: Number(d['Stock'] || d['stock'] || 0),
          supplierName: d['Supplier'] || d['supplierName'] || d['SupplierName'] || '',
          createdAt: d['Created At'] || d['createdAt'] || rec.uploadedAt,
          _id: rec._id,
          source: 'uploaded',
          flags: rec.flags || [],
          uploadedBy: rec.uploadedBy || '',
          uploadedAt: rec.uploadedAt
        };
      });
      const mainProducts = products.map(p => ({ ...p, source: 'main' }));
      const all = [...uniqueRecords, ...uniqueRecords2 ];
      res.json(all);

      console.log("Main Products:");
      console.log(mainProducts);

      console.log("Mapped Uploads:");
      console.log(mappedUploads);

    }
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/items', async (req, res) => {
  try {
    const { itemCode } = req.query;

    // Build the filter object
    let filter = {};
    if (itemCode) {
      // Case-insensitive exact or partial match on itemCode
      filter.itemCode = { $regex: itemCode, $options: 'i' };
    }

    // You can add more filters later (e.g., itemName, category)

    const products = await Product.find(filter);

    if (products.length === 0) {
      return res.status(200).json([]); // Return empty array if no match
    }

    res.json(products);
  } catch (err) {
    console.error('Error in product search:', err.message);
    res.status(500).json({ message: 'Server error while searching products' });
  }
});

// GET: Fetch product by itemCode
router.get('/:itemCode', async (req, res) => {
  try {
    const { itemCode } = req.params;

    // Find product by itemCode (case-insensitive)
    const product = await Product.findOne({ 
      itemCode: { $regex: new RegExp(`^${itemCode}$`, 'i') }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Error fetching product by itemCode:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// GET: Get a specific deleted product by ID
router.get('/deleted/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const deletedProduct = await DeletedProduct.findById(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Deleted product not found' });
    }
    res.json(deletedProduct);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Permanently delete a product from deleted_products collection
router.delete('/deleted/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const deletedProduct = await DeletedProduct.findById(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Deleted product not found' });
    }

    // Also permanently delete from original collection if it still exists
    await Product.findByIdAndDelete(deletedProduct.originalProductId);

    // Remove from deleted_products collection
    await DeletedProduct.findByIdAndDelete(req.params.id);

    await logActivity({
      req,
      action: 'Delete',
      resource: 'Product',
      description: `Permanently deleted product "${deletedProduct.itemName}" (Code: ${deletedProduct.itemCode}) from both collections`
    });

    res.json({ message: 'Product permanently deleted from both collections' });
  } catch (err) {
    console.error('Error permanently deleting product:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET: Fetch all deleted product logs (must be before any /:id route)
router.get('/deleted-logs', async (req, res) => {
  try {
    const logs = await DeletedProductLog.find().sort({ deletedAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware: Function to get a product by ID with ObjectId validation
async function getProduct(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Invalid product ID format' });
  }

  let product;
  try {
    // Find product regardless of deleted status
    product = await Product.findById(req.params.id);
    if (product == null) {
      return res.status(404).json({ message: 'Cannot find product' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  res.product = product;
  next();
}

// PATCH: Soft delete a product (mark as deleted and copy to deleted_products collection)
router.patch('/soft-delete/:id', authMiddleware, getProduct, async (req, res) => {
  try {
    console.log('Soft deleting product:', req.params.id);
    const changedBy = req.body.changedBy || req.query.changedBy || 'system';
    
    // Add delete log to change history
    res.product.changeHistory = [
      ...(res.product.changeHistory || []),
      {
        field: 'product',
        oldValue: JSON.stringify(res.product),
        newValue: null,
        changedBy,
        changedAt: new Date(),
        changeType: 'delete'
      }
    ];

    // Mark as deleted in original collection
    res.product.deleted = true;
    res.product.deletedAt = new Date();
    res.product.deletedBy = changedBy;

    console.log('Product before save - deleted flag:', res.product.deleted);
    console.log('Product before save - deletedAt:', res.product.deletedAt);
    console.log('Product before save - deletedBy:', res.product.deletedBy);

    // Save the updated product in original collection
    await res.product.save();

    await logActivity({
      req,
      action: 'delete',
      resource: 'Product',
      description: `Soft-deleted product "${res.product.itemName}" (Code: ${res.product.itemCode}) and archived to deleted_products`
    });
    
    console.log('Product soft deleted successfully in original collection:', res.product.itemName);

    // Copy to deleted_products collection
    try {
      const deletedProduct = new DeletedProduct({
        itemCode: res.product.itemCode,
        itemName: res.product.itemName,
        category: res.product.category,
        buyingPrice: res.product.buyingPrice,
        sellingPrice: res.product.sellingPrice,
        stock: res.product.stock,
        Supplier: res.product.Supplier,
        newBuyingPrice: res.product.newBuyingPrice,
        newSellingPrice: res.product.newSellingPrice,
        newStock: res.product.newStock,
        oldStock: res.product.oldStock,
        oldBuyingPrice: res.product.oldBuyingPrice,
        oldSellingPrice: res.product.oldSellingPrice,
        changeHistory: res.product.changeHistory,
        deleted: true,
        deletedAt: new Date(),
        deletedBy: changedBy,
        originalProductId: res.product._id
      });

      await deletedProduct.save();
      console.log('Product copied to deleted_products collection successfully');
      
      res.json({ 
        message: 'Product marked as deleted and copied to deleted products collection',
        originalProductId: res.product._id,
        deletedProductId: deletedProduct._id
      });
    } catch (copyErr) {
      console.error('Error copying to deleted_products collection:', copyErr);
      // Even if copying fails, the product is still soft-deleted in original collection
      res.json({ 
        message: 'Product marked as deleted but failed to copy to deleted products collection',
        error: copyErr.message,
        originalProductId: res.product._id
      });
    }
  } catch (err) {
    console.error('Error soft deleting product:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST: Log a product deletion (for tracking deletions from frontend)
// router.post('/deletion-log', authMiddleware, async (req, res) => {
//   try {
//     const { 
//       productId, 
//       itemCode, 
//       itemName, 
//       category, 
//       Supplier, 
//       deletedBy, 
//       deletionType, 
//       changeHistory 
//     } = req.body;

//     // Validate required fields
//     if (!itemCode || !itemName || !deletedBy || !deletionType) {
//       return res.status(400).json({ 
//         message: 'Missing required fields: itemCode, itemName, deletedBy, deletionType are required' 
//       });
//     }

//     // Create deletion log
//     const deletionLog = new DeletedProductLog({
//       itemCode,
//       itemName,
//       category: category || 'Unknown',
//       Supplier: Supplier || 'Unknown',
//       deletedAt: new Date(),
//       deletedBy,
//       deletionType, // 'hard' or 'soft'
//       originalProductId: productId,
//       changeHistory: changeHistory || []
//     });

//     await deletionLog.save();
//     console.log('Deletion log created:', deletionLog.itemName, 'by', deletedBy, 'type:', deletionType);

//     res.status(201).json({ 
//       message: 'Deletion logged successfully',
//       logId: deletionLog._id,
//       deletedProduct: {
//         itemCode,
//         itemName,
//         category,
//         Supplier,
//         deletedAt: deletionLog.deletedAt,
//         deletedBy,
//         deletionType
//       }
//     });
//   } catch (err) {
//     console.error('Error logging deletion:', err);
//     res.status(500).json({ message: err.message });
//   }
// });

// PUT: Inactivate a product (move to inactive_products collection)
router.put('/inactivate/:id', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Copy to inactive collection
    const inactive = new InactiveProduct({
      ...product.toObject(),
      deletedBy: username,
      deletedAt: new Date(),
      originalProductId: product._id,
    });
    await inactive.save();

    // Remove from active collection
    await product.deleteOne();

    await logActivity({
      req,
      action: 'Delete',
      resource: 'Product',
      description: `Inactivated product "${product.itemName}" (Code: ${product.itemCode}) and moved to inactive_products`
    });

    res.json({ message: 'Product moved to inactive', inactiveProductId: inactive._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: List all inactive products
router.get('/inactive', async (req, res) => {
  try {
    const inactives = await InactiveProduct.find().sort({ deletedAt: -1 });
    res.json(inactives);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT: Toggle product visibility
router.put('/toggle-visibility/:id', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Toggle visibility
    product.visible = !product.visible;
    
    if (!product.visible) {
      // Product is being hidden
      product.hiddenAt = new Date();
      product.hiddenBy = username;
    } else {
      // Product is being made visible again
      product.hiddenAt = undefined;
      product.hiddenBy = undefined;
    }

    // Add to change history
    product.changeHistory = [
      ...(product.changeHistory || []),
      {
        field: 'visibility',
        oldValue: !product.visible,
        newValue: product.visible,
        changedBy: username,
        changedAt: new Date(),
        changeType: product.visible ? 'restore' : 'hide'
      }
    ];

    await product.save();
    
    const action = product.visible ? 'made visible' : 'hidden';

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Product "${product.itemName}" (Code: ${product.itemCode}) ${action}`
    });
    
    res.json({ 
      message: `Product ${action} successfully`,
      visible: product.visible,
      productId: product._id
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: List all hidden products
router.get('/hidden', async (req, res) => {
  try {
    const hiddenProducts = await Product.find({ visible: false }).sort({ hiddenAt: -1 });
    res.json(hiddenProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Get all deleted products from deleted_products collection
router.get('/deleted', async (req, res) => {
  try {
    console.log('Fetching deleted products...');

    const deletedProducts = await Product.find({
      deleted: true,
      visible: false
    }).sort({ updatedAt: -1 }).lean();

    console.log(`Found ${deletedProducts.length} deleted products`);
    res.json(deletedProducts);
  } catch (err) {
    console.error('Error fetching deleted products:', err);
    res.status(500).json({ message: err.message });
  }
});

// Restores a single soft-deleted product
router.patch('/:id/restoreProduct', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Optional: log who restored it
    const { restoredBy } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      {
        deleted: false,
        visible: true,
        restoredAt: new Date(),
        restoredBy: restoredBy || 'system'
      },
      { new: true, runValidators: true } // return updated doc
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // ✅ LOG: Restore Product
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Restored product "${product.itemName}" (Code: ${product.itemCode})`
    });

    res.json({
      message: 'Product restored successfully',
      product
    });
  } catch (err) {
    console.error('Error restoring product:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.patch('/restore-all', authMiddleware, async (req, res) => {
  try {
    const result = await Product.updateMany(
      { deleted: true },
      { 
        deleted: false, 
        visible: true,
        restoredAt: new Date(),
        restoredBy: req.user.username // ✅ from JWT
      }
    );

    // ✅ LOG: Bulk restore
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Restored ${result.modifiedCount} products in bulk`
    });


    res.json({ message: 'All products restored' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/products/:id/delete
router.patch('/:id/deleteProduct', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      {
        deleted: true,
        visible: false,
        deletedAt: new Date(),
        deletedBy: deletedBy || 'system'
      },
      { new: true } // return updated doc
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // ✅ LOG: Soft Delete Product
    await logActivity({
      req,
      action: 'delete',
      resource: 'Product',
      description: `Soft-deleted product "${product.itemName}" (Code: ${product.itemCode})`
    });

    res.json({
      message: 'Product deleted successfully',
      product
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET: Get a single product by ID
router.get('/:id', getProduct, (req, res) => {
  res.json(res.product);
});

// GET: Get a single product by ID
router.get('/productitem/:id', getProduct, (req, res) => {
  res.json(res.product);
});

// POST: Create a new product
router.post('/', authMiddleware, async (req, res) => {
  try {
    const existingProduct = await Product.findOne({ itemCode: req.body.itemCode });
    if (existingProduct) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }

    const changeHistory = [{
      field: 'creation',
      oldValue: null,
      newValue: req.body,
      changedBy: req.body.changedBy || 'system',
      changedAt: new Date(),
      changeType: 'create'
    }];
    // If this is from Excel upload, add an addExpense log
    if (req.body.excelUpload) {
      changeHistory.push({
        field: 'stock',
        oldValue: 0,
        newValue: req.body.stock,
        changedBy: req.body.changedBy || 'system',
        changedAt: new Date(),
        changeType: 'addExpense'
      });
    }

    const product = new Product({
      itemCode: req.body.itemCode,
      itemName: req.body.itemName,
      category: req.body.category,
      buyingPrice: req.body.buyingPrice,
      sellingPrice: req.body.sellingPrice,
      stock: req.body.stock,
      Supplier: req.body.Supplier,
      deleted: false, // Explicitly set as not deleted
      visible: true, // Explicitly set as visible
      changeHistory
    });

    const newProduct = await product.save();

    // ✅ DETAILED CREATE LOG
    await logActivity({
      req,
      action: 'Create',
      resource: 'Product',
      description: `Created product "${newProduct.itemName}" (Code: ${newProduct.itemCode}) with stock=${newProduct.stock}, buying=${newProduct.buyingPrice}, selling=${newProduct.sellingPrice}, category="${newProduct.category}", supplier="${newProduct.Supplier}"`
    });


    res.status(201).json(newProduct);
  } catch (err) {
    // Check for MongoDB duplicate key error (code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.itemCode) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Update an existing product (partial update)
router.patch('/:id', authMiddleware, getProduct, async (req, res) => {
  const updates = req.body;
  const changes = [];
  const changeDescriptions = []; // For human-readable log

  // Helper to format values for logs
  function formatValue(val) {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'number') return val.toFixed(2);
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return '[object]';
      }
    }
    return String(val);
  }
  
  // Handle soft delete
  if (updates.isDeleted === true) {
    const changedBy = updates.changedBy || 'system';
    console.log('Soft deleting product:', res.product.itemName, 'ID:', res.product._id);
    
    // Add delete log to change history
    res.product.changeHistory = [
      ...(res.product.changeHistory || []),
      {
        field: 'product',
        oldValue: JSON.stringify(res.product),
        newValue: null,
        changedBy,
        changedAt: new Date(),
        changeType: 'delete'
      }
    ];

    // Mark as deleted
    res.product.deleted = true;
    res.product.deletedAt = new Date();
    res.product.deletedBy = changedBy;

    console.log('Product before save - deleted flag:', res.product.deleted);
    console.log('Product before save - deletedAt:', res.product.deletedAt);
    console.log('Product before save - deletedBy:', res.product.deletedBy);

    try {
      await res.product.save();

      await logActivity({
        req,
        action: 'Delete',
        resource: 'Product',
        description: `Soft-deleted product "${res.product.itemName}" (Code: ${res.product.itemCode})`
      });
      
      console.log('Product saved successfully with deleted flag');
      res.json({ message: 'Product marked as deleted' });
    } catch (err) {
      console.error('Error saving deleted product:', err);
      res.status(500).json({ message: err.message });
    }
    return;
  }
  
  // Handle soft restore
  if (updates.isDeleted === false) {
    const changedBy = updates.changedBy || 'system';
    
    // Add restore log to change history
    res.product.changeHistory = [
      ...(res.product.changeHistory || []),
      {
        field: 'product',
        oldValue: null,
        newValue: JSON.stringify(res.product),
        changedBy,
        changedAt: new Date(),
        changeType: 'restore'
      }
    ];

    // Mark as not deleted
    res.product.deleted = false;
    res.product.deletedAt = undefined;
    res.product.deletedBy = undefined;

    try {
      await res.product.save();

      await logActivity({
        req,
        action: 'edit',
        resource: 'Product',
        description: `Restored product "${res.product.itemName}" (Code: ${res.product.itemCode})`
      });
      
      res.json({ message: 'Product restored successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
    return;
  }
  
  // Handle regular field updates
  const watchFields = ["itemName", "category", "buyingPrice", "sellingPrice", "stock"];
  
  for (const field of watchFields) {
    if (updates[field] !== undefined && res.product[field] !== updates[field]) {
      const oldValue = res.product[field];
      const newValue = updates[field];

      // Push to changeHistory (for audit trail in DB)
      changes.push({
        field,
        oldValue,
        newValue,
        changedBy: req.body.changedBy || 'system',
        changedAt: new Date(),
        changeType: 'update'
      });

      // Push human-readable string for activity log
      changeDescriptions.push(`${field}: ${formatValue(oldValue)} → ${formatValue(newValue)}`);

      // Apply update
      res.product[field] = newValue;
    }
  }

  // Handle regular updates
  // for (const [field, newValue] of Object.entries(updates)) {
  //   if (["itemName", "category", "buyingPrice", "sellingPrice", "stock"].includes(field) && res.product[field] != newValue) {
  //     changes.push({
  //       field,
  //       oldValue: res.product[field],
  //       newValue,
  //       changedBy: req.body.changedBy || 'system',
  //       changedAt: new Date(),
  //       changeType: 'update'
  //     });
  //     res.product[field] = newValue;
  //   }
  // }
  if (changes.length > 0) {
    res.product.changeHistory = [...(res.product.changeHistory || []), ...changes];
  }
  try {
    const updatedProduct = await res.product.save();

    await logActivity({
      req,
      action: 'edit',
      resource: 'Product',
      description: `Updated product "${res.product.itemName}" (Code: ${res.product.itemCode}): ${changeDescriptions.join(', ')}`
    });
    
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT: Full update of a product by ID
router.put('/:id', authMiddleware, getProduct, async (req, res) => {
  // List of updatable fields
  const updatableFields = [
    'itemCode', 'itemName', 'category', 'buyingPrice', 'sellingPrice', 'stock', 'Supplier',
    'newBuyingPrice', 'newSellingPrice', 'newStock',
    'oldStock', 'oldBuyingPrice', 'oldSellingPrice'
  ];

  // Check for itemCode uniqueness if changed
  if (req.body.itemCode && req.body.itemCode !== res.product.itemCode) {
    try {
      const existingProduct = await Product.findOne({ itemCode: req.body.itemCode });
      if (existingProduct) {
        return res.status(400).json({ message: 'GRN already exists. Please use a unique Item Code.' });
      }
    } catch (err) {
      return res.status(500).json({ message: 'Error checking item code: ' + err.message });
    }
  }

  // Replace all updatable fields
  const changes = [];
  for (const field of updatableFields) {
    if (req.body[field] !== undefined && res.product[field] !== req.body[field]) {
      changes.push({
        field,
        oldValue: res.product[field],
        newValue: req.body[field],
        changedBy: req.body.changedBy || 'system',
        changedAt: new Date(),
        changeType: 'update'
      });
      // If this is from Excel upload and field is stock, add addExpense log
      if (req.body.excelUpload && field === 'stock') {
        changes.push({
          field: 'stock',
          oldValue: res.product[field],
          newValue: req.body[field],
          changedBy: req.body.changedBy || 'system',
          changedAt: new Date(),
          changeType: 'addExpense'
        });
      }
    }
  }
  if (changes.length > 0) {
    res.product.changeHistory = [...(res.product.changeHistory || []), ...changes];
  }

  try {
    const updatedProduct = await res.product.save();

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Fully updated product "${res.product.itemName}" (Code: ${res.product.itemCode}): ${changes.join(', ')}`
    });


    res.json(updatedProduct);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.itemCode) {
      return res.status(400).json({ message: 'GRN already exists. Please use a unique Item Code.' });
    }
    res.status(400).json({ message: err.message });
  }
});

// DELETE: Remove a product
router.delete('/:id', authMiddleware, getProduct, async (req, res) => {
  try {
    const changedBy = req.body.changedBy || req.query.changedBy || 'system';
    res.product.changeHistory = [
      ...(res.product.changeHistory || []),
      {
        field: 'product',
        oldValue: JSON.stringify(res.product),
        newValue: null,
        changedBy,
        changedAt: new Date(),
        changeType: 'delete'
      }
    ];
    await res.product.save();

    // ARCHIVE: Save to DeletedProductLog BEFORE deleting
    let archive;
    try {
      archive = await DeletedProductLog.create({
        itemCode: res.product.itemCode,
        itemName: res.product.itemName,
        category: res.product.category,
        Supplier: res.product.Supplier,
        deletedAt: new Date(),
        changeHistory: res.product.changeHistory,
      });
    } catch (archiveErr) {
      return res.status(500).json({ message: 'Failed to archive deleted product. Product was NOT deleted.', error: archiveErr.message });
    }

    if (!archive) {
      return res.status(500).json({ message: 'Failed to archive deleted product. Product was NOT deleted.' });
    }

    // DELETE: Remove from main collection
    await res.product.deleteOne();

    await logActivity({
      req,
      action: 'Delete',
      resource: 'Product',
      description: `Hard deleted product "${res.product.itemName}" (Code: ${res.product.itemCode}) and archived to deletion log`
    });

    res.json({ message: 'Deleted Product' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Get a product by itemCode
router.get('/grnNumber/:grnNumber', async (req, res) => {
  try {
    const product = await Product.find({ grnNumber: req.params.grnNumber });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH: Restore a deleted product from deleted_products collection
router.patch('/restore/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    const changedBy = req.body.changedBy || req.query.changedBy || 'system';
    
    // Find the deleted product in deleted_products collection
    const deletedProduct = await DeletedProduct.findById(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Deleted product not found' });
    }

    // Find the original product in the main collection
    const originalProduct = await Product.findById(deletedProduct.originalProductId);
    if (!originalProduct) {
      return res.status(404).json({ message: 'Original product not found' });
    }

    // Add restore log to change history
    originalProduct.changeHistory = [
      ...(originalProduct.changeHistory || []),
      {
        field: 'product',
        oldValue: null,
        newValue: JSON.stringify(originalProduct),
        changedBy,
        changedAt: new Date(),
        changeType: 'restore'
      }
    ];

    // Mark as not deleted in original collection
    originalProduct.deleted = false;
    originalProduct.deletedAt = undefined;
    originalProduct.deletedBy = undefined;

    await originalProduct.save();
    console.log('Product restored successfully in original collection');

    // Remove from deleted_products collection
    await DeletedProduct.findByIdAndDelete(req.params.id);
    console.log('Product removed from deleted_products collection');

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Restored deleted product "${originalProduct.itemName}" (Code: ${originalProduct.itemCode}) from deleted_products collection`
    });

    res.json({ 
      message: 'Product restored successfully',
      originalProductId: originalProduct._id
    });
  } catch (err) {
    console.error('Error restoring product:', err);
    res.status(500).json({ message: err.message });
  }
});

// PATCH: Update stock and price of an existing product or create new
router.post('/update-stock/*', authMiddleware ,async (req, res) => {
  try {
    const itemCode = req.params[0];
    if (!itemCode) {
      return res.status(400).json({ message: 'Item code is required' });
    }
    const decodedItemCode = decodeURIComponent(itemCode);

    const { newStock, newBuyingPrice, newSellingPrice, itemName, grnNumber, category, supplierName } = req.body;

    // Validate required fields
    if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
      return res.status(400).json({ message: 'Item name is required and must be a non-empty string' });
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ message: 'Category is required and must be a non-empty string' });
    }
    if (newStock === undefined || newStock === null || newStock === '' || isNaN(Number(newStock)) || Number(newStock) < 0) {
      return res.status(400).json({ message: 'New stock is required and must be a non-negative number' });
    }
    if (newBuyingPrice === undefined || newBuyingPrice === null || newBuyingPrice === '' || isNaN(Number(newBuyingPrice)) || Number(newBuyingPrice) < 0) {
      return res.status(400).json({ message: 'New buying price is required and must be a non-negative number' });
    }
    if (newSellingPrice === undefined || newSellingPrice === null || newSellingPrice === '' || isNaN(Number(newSellingPrice)) || Number(newSellingPrice) < 0) {
      return res.status(400).json({ message: 'New selling price is required and must be a non-negative number' });
    }
    // Supplier name is now optional - use empty string if not provided
    const finalSupplier = supplierName || 'Unknown';

    // let product = await Product.findOne({ decodedItemCode });

    
      // Check if itemCode is already used by another product (double-check)
      // const duplicateCheck = await Product.findOne({ decodedItemCode });
      // if (duplicateCheck) {
      //   return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
      // }
      let product ;

              // Create new product if it doesn't exist
        product = new Product({
          itemCode: decodedItemCode,
          itemName,
          category,
          grnNumber,
          buyingPrice: Number(newBuyingPrice),
          sellingPrice: Number(newSellingPrice),
          stock: Number(newStock),
          Supplier: finalSupplier,
          deleted: false, // Explicitly set as not deleted
          visible: true, // Explicitly set as visible
          // changeHistory: [{
          //   field: 'creation',
          //   oldValue: null,
          //   newValue: { decodedItemCode, itemName, category, buyingPrice: Number(newBuyingPrice), sellingPrice: Number(newSellingPrice), stock: Number(newStock), Supplier: finalSupplier },
          //   changedBy: req.body.changedBy || 'system',
          //   changedAt: new Date(),
          //   changeType: 'create'
          // }]
        });
    
    const updatedProduct = await product.save();

    // ✅ DETAILED CREATE LOG
    await logActivity({
      req,
      action: 'create',
      resource: 'Product',
      description: `Created product "${updatedProduct.itemName}" (Code: ${updatedProduct.itemCode}) with stock=${updatedProduct.stock}, buying=${updatedProduct.buyingPrice}, selling=${updatedProduct.sellingPrice}, category="${updatedProduct.category}", supplier="${updatedProduct.Supplier}"`
    });
    
    res.json({ message: "Stock updated successfully", updatedProduct });
  } catch (err) {
    // Check for MongoDB duplicate key error (code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.decodedItemCode) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Update stock and price of an existing product or create new
router.patch('/update-stockitem/*', authMiddleware, async (req, res) => {
  try {
    const itemCode = req.params[0];
    if (!itemCode) {
      return res.status(400).json({ message: 'Item code is required' });
    }
    const decodedItemCode = decodeURIComponent(itemCode);

    const { newStock, newBuyingPrice, newSellingPrice, returnstock, itemName, category, supplierName } = req.body;

    // Validate required fields
    if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
      return res.status(400).json({ message: 'Item name is required and must be a non-empty string' });
    }
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ message: 'Category is required and must be a non-empty string' });
    }
    if (newStock === undefined || newStock === null || newStock === ''  || Number(newStock) < 0) {
      return res.status(400).json({ message: 'New stock is required and must be a non-negative number' });
    }
    if (newBuyingPrice === undefined || newBuyingPrice === null || newBuyingPrice === '' || Number(newBuyingPrice) < 0) {
      return res.status(400).json({ message: 'New buying price is required and must be a non-negative number' });
    }
    if (newSellingPrice === undefined || newSellingPrice === null || newSellingPrice === ''  || Number(newSellingPrice) < 0) {
      return res.status(400).json({ message: 'New selling price is required and must be a non-negative number' });
    }
    // Supplier name is now optional - use empty string if not provided
    const finalSupplier = supplierName || 'Unknown';
    

    let product = await Product.findOne({ itemCode: decodedItemCode });
      // Log stock change
      // const changes = [];
      // if (product.stock !== newStock) {
      //   changes.push({
      //     field: 'stock',
      //     oldValue: product.stock,
      //     newValue: newStock,
      //     changedBy: req.body.changedBy || 'system',
      //     changedAt: new Date(),
      //     changeType: 'update'
      //   });
      // }
      // if (product.buyingPrice !== newBuyingPrice) {
      //   changes.push({
      //     field: 'buyingPrice',
      //     oldValue: product.buyingPrice,
      //     newValue: newBuyingPrice,
      //     changedBy: req.body.changedBy || 'system',
      //     changedAt: new Date(),
      //     changeType: 'update'
      //   });
      // }
      // if (product.sellingPrice !== newSellingPrice) {
      //   changes.push({
      //     field: 'sellingPrice',
      //     oldValue: product.sellingPrice,
      //     newValue: newSellingPrice,
      //     changedBy: req.body.changedBy || 'system',
      //     changedAt: new Date(),
      //     changeType: 'update'
      //   });
      // }
      // if (changes.length > 0) {
      //   product.changeHistory = [...(product.changeHistory || []), ...changes];
      // }
      if (returnstock > 0){
        product.stock -= parseInt(returnstock);
      }

      // Update the stock and prices
      product.stock = Number(newStock);
      product.buyingPrice = Number(newBuyingPrice);
      product.sellingPrice = Number(newSellingPrice);
      product.Supplier = finalSupplier;
      product.returnstock = parseInt(returnstock);
    
    const updatedProduct = await product.save();

    const changes = [];
    if (req.body.newStock != null) changes.push(`stock: ${product.stock - (req.body.returnstock || 0)} → ${req.body.newStock}`);
    if (req.body.newBuyingPrice != null) changes.push(`buying: ${product.buyingPrice} → ${req.body.newBuyingPrice}`);
    if (req.body.newSellingPrice != null) changes.push(`selling: ${product.sellingPrice} → ${req.body.newSellingPrice}`);

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Updated stock/prices for "${product.itemName}" (Code: ${decodedItemCode}): ${changes.join(', ')}`
    });
    
    res.json({ message: "Stock updated successfully", updatedProduct });
  } catch (err) {
    // Check for MongoDB duplicate key error (code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.decodedItemCode) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }
    res.status(400).json({ message: err.message });
  }
});

router.patch('/update-damagedstockitem/*', authMiddleware, async (req, res) => {
  try {
    const itemCode = req.params[0];
    if (!itemCode) {
      return res.status(400).json({ message: 'Item code is required' });
    }
    const decodedItemCode = decodeURIComponent(itemCode);

    const {  damagedstock } = req.body; 

    let product = await Product.findOne({ itemCode: decodedItemCode });

    const oldStock = product.stock;
      
      if (damagedstock > 0){
        product.stock -= parseInt(damagedstock);
      }

      product.damagedstock += parseInt(damagedstock);
    
    const updatedProduct = await product.save();

    // ✅ LOG: Edit Product (return stock update)
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Updated return stock for "${product.itemName}" (Code: ${product.itemCode}): returnstock ${product.damagedstock}, stock ${oldStock} → ${updatedProduct.stock}`
    });
    
    res.json({ message: "Stock updated successfully", updatedProduct });
  } catch (err) {
    // Check for MongoDB duplicate key error (code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.decodedItemCode) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }
    res.status(400).json({ message: err.message });
  }
});

// PATCH: Update stock and price of an existing product or create new
router.patch('/update-returnstockitem/*', authMiddleware, async (req, res) => {
  try {
    const itemCode = req.params[0];
    if (!itemCode) {
      return res.status(400).json({ message: 'Item code is required' });
    }
    const decodedItemCode = decodeURIComponent(itemCode);

    const {  returnstock } = req.body; 

    let product = await Product.findOne({ itemCode: decodedItemCode });

    const oldStock = product.stock;
    const oldReturnStock = product.returnstock;
    const oldReturnRelease = product.returnRelease || 0;
      
    if (returnstock > 0){
      product.stock -= parseInt(returnstock);
    }

    product.returnstock += parseInt(returnstock);

    // ✅ Reduce returnRelease, but only if > 0 and only up to qty
    if (oldReturnRelease > 0) {
      const reduceBy = Math.min(oldReturnRelease, returnstock);
      product.returnRelease = oldReturnRelease - reduceBy;
    } // else: leave returnRelease unchanged (already 0)
    
    const updatedProduct = await product.save();

    // ✅ LOG: Edit Product (return stock update)
    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Updated return stock for "${product.itemName}" (Code: ${product.itemCode}): returnstock ${product.returnstock}, stock ${oldStock} → ${updatedProduct.stock}`
    });
    
    res.json({ message: "Stock updated successfully", updatedProduct });
  } catch (err) {
    // Check for MongoDB duplicate key error (code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.decodedItemCode) {
      return res.status(400).json({ message: "Item Code already exists. Please use a unique Item Code." });
    }
    res.status(400).json({ message: err.message });
  }
});

// POST or PATCH /api/products/increase-return-release/:itemCode
router.patch('/increase-return-release/:itemCode', authMiddleware, async (req, res) => {
  try {
    const { itemCode } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Valid positive quantity required' });
    }

    const product = await Product.findOne({ itemCode });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const qty = parseInt(quantity, 10);

    const currentReturnStock = product.returnstock || 0;
    if (qty > currentReturnStock) {
      return res.status(400).json({ 
        message: `Cannot release ${qty} items — only ${currentReturnStock} in return stock` 
      });
    }

    // Increase BOTH stock and returnRelease
    product.stock += qty;
    product.returnRelease = (product.returnRelease || 0) + qty;
    product.returnstock = currentReturnStock - qty;

    await product.save();

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Increased returnRelease and stock by ${qty} for "${product.itemName}" (Code: ${itemCode})`
    });

    res.json({ message: 'Return release increased successfully', product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH: Process product return
router.patch('/return/:id', authMiddleware, async (req, res) => {
  try {
    const { returnQuantity, returnType } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const quantity = Number(returnQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      console.error('Invalid return quantity:', returnQuantity);
      return res.status(400).json({ message: 'Invalid return quantity' });
    }

    if (returnType === 'out-stock') {
      if (product.stock < quantity) {
        console.error('Return quantity exceeds available stock:', quantity);
        return res.status(400).json({ message: 'Return quantity exceeds available stock' });
      }
      // Log stock change before reducing
      product.changeHistory = [
        ...(product.changeHistory || []),
        {
          field: 'stock',
          oldValue: product.stock,
          newValue: product.stock - quantity,
          changedBy: req.body.changedBy || 'system',
          changedAt: new Date(),
          changeType: 'update'
        }
      ];
      product.stock -= quantity; // Reduce stock
    }

    const updatedProduct = await product.save();

    await logActivity({
      req,
      action: 'Edit',
      resource: 'Product',
      description: `Processed return of ${quantity} units for "${product.itemName}" (Code: ${product.itemCode}), stock reduced from ${product.stock + quantity} to ${product.stock}`
    });
    
    res.json({ message: 'Product return processed', updatedProduct });
  } catch (err) {
    console.error('Error processing return:', err);
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: Backfill stock changeHistory for all products
// router.post('/backfill-stock-history', authMiddleware, async (req, res) => {
//   try {
//     const products = await Product.find();
//     let updatedCount = 0;
//     for (const product of products) {
//       let history = product.changeHistory || [];
//       let prevStock = null;
//       let newHistory = [];
//       // Find the initial stock value
//       if (history.length > 0 && history[0].field === 'creation' && history[0].newValue && history[0].newValue.stock !== undefined) {
//         prevStock = history[0].newValue.stock;
//       } else if (product.stock !== undefined) {
//         prevStock = product.stock;
//       }
//       for (let i = 0; i < history.length; i++) {
//         const log = history[i];
//         if (log.field === 'stock' && log.changeType !== 'update') {
//           // Convert old stock logs to 'update'
//           newHistory.push({ ...log, changeType: 'update' });
//           prevStock = log.newValue;
//         } else if (log.field === 'stock') {
//           newHistory.push(log);
//           prevStock = log.newValue;
//         } else {
//           newHistory.push(log);
//         }
//         // If the next log is not a stock change, but the stock value changed, add a synthetic log
//         if (i < history.length - 1 && history[i + 1].field !== 'stock' && product.stock !== prevStock) {
//           newHistory.push({
//             field: 'stock',
//             oldValue: prevStock,
//             newValue: product.stock,
//             changedBy: 'system-backfill',
//             changedAt: new Date(),
//             changeType: 'update'
//           });
//           prevStock = product.stock;
//         }
//       }
//       // If no stock change logs exist but stock changed from initial, add one
//       if (!history.some(log => log.field === 'stock') && prevStock !== product.stock) {
//         newHistory.push({
//           field: 'stock',
//           oldValue: prevStock,
//           newValue: product.stock,
//           changedBy: 'system-backfill',
//           changedAt: new Date(),
//           changeType: 'update'
//         });
//       }
//       product.changeHistory = newHistory;
//       await product.save();
//       updatedCount++;
//     }
//     res.json({ message: `Backfilled stock changeHistory for ${updatedCount} products.` });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

module.exports = router;