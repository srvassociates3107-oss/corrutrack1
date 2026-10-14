import { CorrugatedOrder, FactorySettings, ProductionHead } from '../types/order';
import { STAGE_CONFIG, formatDateTime } from './whatsapp';
import { getProductCatalogItem } from './productCatalog';

/**
 * Generates a crystal-clear, respectful shopfloor job card alert in pure Hindi (हिन्दी)
 * Specifically crafted for production heads, supervisors and machine line operators
 * who have difficulty reading English.
 */
export function generateProductionHeadHindiWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  productionHead?: ProductionHead
): string {
  const stageInfo = STAGE_CONFIG[order.currentStage];
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const headName = productionHead?.name || settings.productionSupervisorName || 'सुपरवाइजर';
  const product = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || product.subCategories[0]?.title || 'स्टैंडर्ड';
  const reqs = order.productRequirements || {};

  // Product specific technical details in Hindi
  let productSpecsHindi = '';

  if (!order.productType || order.productType === 'paper_box') {
    productSpecsHindi = `📐 *बॉक्स साइज:* ${order.dimensions.lengthMm} (लंबाई L) x ${order.dimensions.widthMm} (चौड़ाई W) x ${order.dimensions.heightMm} (ऊंचाई H) mm
📄 *प्लाई व फ्लूट:* ${order.ply} | फ्लूट: ${order.flute}
🔬 *पेपर GSM:*
 • टॉप लाइनर (Top): ${order.paperSpecs.topLinerGsm} GSM (${order.paperSpecs.paperGrade || 'क्राफ्ट'})
 • फ्लूटिंग मीडियम (Flute): ${order.paperSpecs.flutingMediumGsm} GSM
 • बॉटम लाइनर (Bottom): ${order.paperSpecs.bottomLinerGsm} GSM
 • मजबूती (BF): ${order.paperSpecs.burstingFactor} BF
✨ *लेमिनेशन:* ${order.lamination || 'कोई नहीं'}
🎨 *प्रिंटिंग:* ${order.colorType || 'सादा'} (${order.printingDetails || 'स्टैंडर्ड'})
🔗 *जोड़/सिलाई:* ${order.jointType}`;
  } else if (order.productType === 'paper_bag') {
    productSpecsHindi = `📐 *बैग साइज:* ${order.dimensions.lengthMm}mm (ऊंचाई) x ${order.dimensions.widthMm}mm (चौड़ाई) x ${order.dimensions.heightMm}mm (तली/गसेट)
📄 *कागज़:* ${reqs.paperGsm || '120 GSM'} (${reqs.paperType || 'ब्राउन क्राफ्ट'})
🛍️ *हैंडल:* ${reqs.handleType || 'ट्विस्टेड पेपर डोरी'}
📦 *सपोर्ट:* ${reqs.bottomReinforcement || 'तली में गत्ता लगा हुआ'}
⚖️ *वजन क्षमता:* ${reqs.weightCapacityKg || '5 - 7 Kg'}
🎨 *प्रिंटिंग:* ${order.printingDetails || '1-कलर लोगो'}`;
  } else if (order.productType === 'duplex_box') {
    productSpecsHindi = `📐 *बॉक्स साइज:* ${order.dimensions.lengthMm}mm (L) x ${order.dimensions.widthMm}mm (W) x ${order.dimensions.heightMm}mm (H)
📄 *गत्ता क्वालिटी:* ${reqs.boardGsm || '350 GSM'}
✨ *लेमिनेशन/कोटिंग:* ${reqs.surfaceFinish || order.lamination || 'ग्लास लेमिनेशन'}
🔒 *बॉटम लॉक:* ${reqs.pastingLockType || 'क्रैश लॉक ऑटो बॉटम'}
🪟 *विंडो:* ${reqs.windowPatching || 'बिना खिड़की'}
🎨 *प्रिंटिंग:* ${order.colorType || 'ऑफसेट 4-कलर'} (${order.printingDetails || 'फुल प्रिंट'})`;
  } else if (order.productType === 'non_woven_bag') {
    productSpecsHindi = `📐 *बैग साइज:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} इंच/mm
🧵 *कपड़े का GSM:* ${reqs.fabricGsm || '60 GSM'}
🎨 *कपड़े का रंग:* ${reqs.fabricColor || 'रॉयल ब्लू'}
⚡ *सीलिंग:* ${reqs.sealingMethod || 'अल्ट्रासोनिक हीट वेल्डेड'}
👜 *हैंडल:* ${reqs.handleLength || '14 इंच लूप हैंडल'}
🎨 *प्रिंटिंग:* ${order.printingDetails || 'स्क्रीन प्रिंटिंग'}`;
  } else if (order.productType === 'cake_base') {
    productSpecsHindi = `📐 *बेस साइज/व्यास:* ${reqs.baseSizeDiameter || '10 इंच / 250 mm'}
📏 *मोटाई (Thickness):* ${reqs.thicknessMm || '3.0 mm'}
✨ *फॉयल फिनिश:* ${reqs.surfaceFoil || 'गोल्डन फॉयल'}
✂️ *किनारे (Edge):* ${reqs.edgeFinish || 'मुड़ा हुआ चिकना किनारा'}
🛡️ *ऑयल प्रूफ:* ${reqs.isGreaseProof !== false ? 'हाँ (100% ग्रीसप्रूफ फूड ग्रेड)' : 'नहीं'}`;
  } else if (order.productType === 'plastic_container') {
    productSpecsHindi = `🥛 *क्षमता (Volume):* ${reqs.capacityMl || '750 ml'}
🍱 *खाने (Compartments):* ${reqs.compartments || '1-खाना (Single)'}
🔬 *मटेरियल:* ${reqs.materialGrade || 'PP (माइक्रोवेव सेफ)'}
🎨 *रंग:* ${reqs.containerColor || 'ब्लैक बेस + ट्रांसपेरेंट ढक्कन'}
🔒 *ढक्कन फिटिंग:* ${reqs.lidSealType || 'लीक-प्रूफ स्नैप लिड'}`;
  }

  // Priority in Hindi
  const priorityHindi = order.priority === 'Emergency Batch' 
    ? '🚨 अति-आवश्यक (इमरजेंसी तुरंत शुरू करें)' 
    : order.priority === 'High / Urgent' 
    ? '⚡ अर्जेंट (प्राथमिकता दें)' 
    : 'सामान्य (नॉर्मल)';

  // Hindi stage name
  const stageHindiMap: Record<string, string> = {
    ORDER_PLACED: '1. नया ऑर्डर मिला व जॉब कार्ड बना',
    BOARD_PROCESSING: '2. बोर्ड / शीट मेकिंग जारी है',
    PRINTING_SLOTTING: '3. प्रिंटिंग, कटिंग व पेस्टिंग जारी है',
    READY_FOR_DISPATCH: '4. माल तैयार है (पैकिंग पूरी)',
    OUT_FOR_DELIVERY: '5. डिलीवरी के लिए रवाना हो गया',
    DELIVERED: '6. पार्टी को माल डिलीवर हो गया',
  };
  const currentStageHindi = stageHindiMap[order.currentStage] || stageInfo.title;

  return `🏭 *कारखाना उत्पादन जॉब कार्ड (Job Card) #${order.id}*

नमस्ते *${headName}* जी,
कारखाने में नया प्रोडक्शन वर्क ऑर्डर शेड्यूल किया गया है:

📋 *ऑर्डर नंबर:* #${order.id}
📦 *उत्पाद (Product):* *${product.titleHindi}*
🏷️ *सब-कैटेगरी:* ${subCategoryName}
📊 *कुल मात्रा (Quantity):* *${order.quantity.toLocaleString()} ${product.defaultUnitNameHindi}* (${order.bundlesCount ? `${order.bundlesCount} बंडल` : 'पैकिंग'})
⚠️ *प्राथमिकता (Priority):* *${priorityHindi}*
📍 *मौजूदा स्टेज:* ${currentStageHindi}

--- 🛠️ *टेक्निकल स्पेसिफिकेशन* ---
${productSpecsHindi}

🏢 *ग्राहक / पार्टी:* ${order.customerCompany}
⏱️ *डिलीवरी की आखिरी तारीख:* *${formattedDelivery}*
⚙️ *निर्धारित मशीन लाइन:* ${order.assignedLine || 'मुख्य कन्वर्टिंग लाइन'}
👨‍🏭 *ऑपरेटर इन-चार्ज:* ${order.operatorInCharge || headName}
👔 *सेल्स हेड:* ${order.salesPersonName || 'सेल्स टीम'} (${order.salesPersonPhone || settings.contactNumber})

👉 *सुपरवाइजर विशेष निर्देश:*
कृपया कच्चा माल (Raw Material) और मशीन लाइन तुरंत चेक करें। साइज और प्रिंटिंग का सैंपल पास होने के बाद ही पूरा लॉट चलाएं!

- *${settings.companyName} | प्रोडक्शन कंट्रोल रूम*`;
}

/**
 * Hinglish version (Simple Hindi written in English alphabets)
 * for floor operators who prefer reading WhatsApp without Hindi script.
 */
export function generateProductionHeadHinglishWhatsappMessage(
  order: CorrugatedOrder,
  settings: FactorySettings,
  productionHead?: ProductionHead
): string {
  const formattedDelivery = formatDateTime(order.expectedDeliveryDate);
  const headName = productionHead?.name || settings.productionSupervisorName || 'Production Supervisor';
  const product = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || product.subCategories[0]?.title || 'Standard';

  return `🏭 *FACTORY JOB CARD ALERT #${order.id}*

Namaste *${headName}* ji,
Factory me naya production order schedule hua hai:

📋 *Order ID:* #${order.id}
📦 *Product:* ${product.title} (${subCategoryName})
📊 *Quantity:* *${order.quantity.toLocaleString()} ${product.defaultUnitName}*
⚠️ *Priority:* *${order.priority.toUpperCase()}*
⏱️ *Delivery Deadline:* *${formattedDelivery}*

📐 *Size:* ${order.dimensions.lengthMm} x ${order.dimensions.widthMm} x ${order.dimensions.heightMm} mm
🏢 *Party:* ${order.customerCompany}
⚙️ *Machine Line:* ${order.assignedLine || 'Main Line'}
👨‍🏭 *Operator:* ${order.operatorInCharge || headName}
👔 *Sales Rep:* ${order.salesPersonName || 'Sales Desk'} (${order.salesPersonPhone || settings.contactNumber})

👉 *Supervisor Note:*
Kripya raw material aur machine queue check karke kaam turant schedule karein. Delivery SLA meet hona chahiye!

- *${settings.companyName}*`;
}
