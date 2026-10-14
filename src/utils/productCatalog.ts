import { ProductType, CorrugatedOrder } from '../types/order';

export interface ProductCatalogItem {
  id: ProductType;
  title: string;
  titleHindi: string;
  shortDesc: string;
  icon: string; // Lucide icon identifier
  defaultUnitName: string; // e.g. 'box', 'bag', 'base', 'container'
  defaultUnitNameHindi: string;
  defaultRate: number;
  defaultQuantity: number;
  subCategories: Array<{
    id: string;
    title: string;
    titleHindi: string;
    description: string;
    descriptionHindi: string;
  }>;
  additionalRequirements: Array<{
    key: string;
    label: string;
    labelHindi: string;
    type: 'select' | 'text' | 'number' | 'boolean';
    options?: string[];
    defaultValue: any;
    hint?: string;
    hintHindi?: string;
  }>;
}

export const PRODUCT_CATALOG: Record<ProductType, ProductCatalogItem> = {
  paper_box: {
    id: 'paper_box',
    title: 'Paper Box (Corrugated / Rigid)',
    titleHindi: 'पेपर बॉक्स / कार्टन (Paper Box)',
    shortDesc: 'Corrugated cartons, heavy shipping boxes, die-cut mailers & mono cartons',
    icon: 'Package',
    defaultUnitName: 'box',
    defaultUnitNameHindi: 'बॉक्स',
    defaultRate: 34,
    defaultQuantity: 3000,
    subCategories: [
      {
        id: '3_ply',
        title: '3-Ply Corrugated Box',
        titleHindi: '3-प्लाई लाइट कार्टन (Lightweight)',
        description: 'Single wall fluted carton for light commercial packaging, FMCG & garments',
        descriptionHindi: 'हल्के सामान और कपड़ों के लिए सिंगल वॉल बॉक्स',
      },
      {
        id: '5_ply',
        title: '5-Ply Master Shipping Carton',
        titleHindi: '5-प्लाई हैवी मास्टर कार्टन (Standard)',
        description: 'Double wall high-stacking box for industrial transport & retail shipping',
        descriptionHindi: 'भारी सामान व ट्रांसपोर्ट के लिए डबल वॉल कार्टन',
      },
      {
        id: '7_ply',
        title: '7-Ply Heavy Duty Export Box',
        titleHindi: '7-प्लाई एक्सपोर्ट मास्टर बॉक्स (Heavy Duty)',
        description: 'Triple wall export-grade box with maximum puncture resistance & bursting factor',
        descriptionHindi: 'मशीनरी व एक्सपोर्ट के लिए 7-प्लाई मजबूत बॉक्स',
      },
      {
        id: 'mailer',
        title: 'Die-Cut Self Locking Mailer Box',
        titleHindi: 'डाई-कट सेल्फ लॉकिंग मेलर (E-Commerce)',
        description: 'Front-fold e-commerce tuck-in box with sharp creases and precise die cuts',
        descriptionHindi: 'ई-कॉमर्स और ब्रांडेड डिलीवरी के लिए फोल्डिंग मेलर',
      },
      {
        id: 'mono_carton',
        title: 'Mono Carton / Tuck Top Box',
        titleHindi: 'मोनो कार्टन / फार्मा बॉक्स (Mono Carton)',
        description: 'Folding single-sheet carton for pharmaceuticals, cosmetics & retail packs',
        descriptionHindi: 'दवा, कॉस्मेटिक और टूथपेस्ट स्टाइल सिंगल शीट बॉक्स',
      },
      {
        id: 'rigid_box',
        title: 'Rigid Setup / Luxury Gift Box',
        titleHindi: 'रिजिड गिफ्ट बॉक्स (Luxury Setup Box)',
        description: 'Stiff chipboard wrapped in fine textured art paper for premium gifting & phones',
        descriptionHindi: 'मोबाइल और गिफ्ट के लिए मजबूत हार्डबोर्ड बॉक्स',
      },
    ],
    additionalRequirements: [
      {
        key: 'boxFlute',
        label: 'Flute Profile',
        labelHindi: 'फ्लूट प्रोफाइल (Flute Profile)',
        type: 'select',
        options: ['Narrow E-Flute (1.5mm Micro)', 'B-Flute (3.0mm Standard)', 'C-Flute (4.0mm Medium)', 'BC-Flute (7.0mm Combined)'],
        defaultValue: 'C-Flute (4.0mm Medium)',
      },
      {
        key: 'boxJoint',
        label: 'Joint & Closure',
        labelHindi: 'जोड़ / सिलाई का प्रकार (Joint Type)',
        type: 'select',
        options: ['Wire Stitched (पिन सिलाई)', 'PVA Cold Glue (गम पेस्टिंग)', 'Hot Melt Adhesive (हॉट मेल्ट)'],
        defaultValue: 'Wire Stitched (पिन सिलाई)',
      },
      {
        key: 'burstFactor',
        label: 'Paper Burst Factor (BF)',
        labelHindi: 'कागज की मजबूती (Burst Factor - BF)',
        type: 'select',
        options: ['18 BF (Standard Commercial)', '20 BF (High Strength)', '22 BF (Virgin Kraft)', '24 BF (Export Heavy Duty)', '28 BF (Specialty Kraft)'],
        defaultValue: '22 BF (Virgin Kraft)',
      },
      {
        key: 'moistureProof',
        label: 'Moisture Barrier / Wax Coating',
        labelHindi: 'नमी से बचाव कोटिंग (Moisture Barrier)',
        type: 'boolean',
        defaultValue: false,
        hint: 'Adds water-resistant wax or aqueous coating for cold storage',
        hintHindi: 'कोल्ड स्टोरेज के लिए वॉटरप्रूफिंग कोटिंग',
      },
    ],
  },

  paper_bag: {
    id: 'paper_bag',
    title: 'Paper Bag (Kraft & Shopping Bags)',
    titleHindi: 'पेपर बैग / थैला (Paper Bag)',
    shortDesc: 'Twisted handle, flat handle grocery bags, D-cut punch bags & luxury retail totes',
    icon: 'ShoppingBag',
    defaultUnitName: 'bag',
    defaultUnitNameHindi: 'बैग',
    defaultRate: 14,
    defaultQuantity: 5000,
    subCategories: [
      {
        id: 'twisted_handle',
        title: 'Twisted Paper Handle Bag',
        titleHindi: 'ट्विस्टेड पेपर हैंडल बैग (Twisted Handle)',
        description: 'High-volume machine-made retail bag with strong twisted paper cord handle',
        descriptionHindi: 'कपड़े और शोरूम के लिए गोल मुड़ी हुई डोरी वाला बैग',
      },
      {
        id: 'flat_handle',
        title: 'Flat Handle Grocery & Delivery Bag',
        titleHindi: 'फ्लैट हैंडल किराना बैग (Flat Handle)',
        description: 'Folded paper flat handle for supermarket groceries, restaurant food takeout',
        descriptionHindi: 'किराना व रेस्टोरेंट होम डिलीवरी के लिए चौड़े हैंडल वाला बैग',
      },
      {
        id: 'd_cut_paper',
        title: 'D-Cut Punch Handle Paper Bag',
        titleHindi: 'D-कट पंच होल पेपर बैग (D-Cut)',
        description: 'Die-cut oval hand hole on bag neck for pharmacy, sweets & jewelry shops',
        descriptionHindi: 'दवा दुकान और मिठाई के लिए हाथ का कट-आउट वाला थैला',
      },
      {
        id: 'sos_block_bottom',
        title: 'SOS Flat Bottom Block Bag (Self-Opening Satchel)',
        titleHindi: 'SOS फ्लैट बॉटम बेकरी बैग (No Handle)',
        description: 'Block base freestanding bag without handles for bakeries, flour & snacks',
        descriptionHindi: 'बेकरी, ब्रेड और ड्राई फ्रूट्स के लिए बिना हैंडल का खड़ा होने वाला बैग',
      },
      {
        id: 'luxury_ribbon',
        title: 'Luxury Boutique Bag with Satin Ribbon',
        titleHindi: 'लक्ज़री बुटीक बैग (Ribbon / Rope Handle)',
        description: 'Laminated thick art paper bag with cotton rope or satin ribbon for jewelry & couture',
        descriptionHindi: 'सोने-चांदी और महंगे शोरूम के लिए रेशमी रिबन वाला बैग',
      },
      {
        id: 'white_bleached',
        title: 'White Bleached Kraft Premium Bag',
        titleHindi: 'सफेद क्राफ्ट प्रीमियम बैग (White Kraft)',
        description: 'Food-grade bleached white virgin paper for pharmacies, cafes and high-end gifting',
        descriptionHindi: 'मेडिकल और कैफे के लिए साफ सफेद फूड ग्रेड बैग',
      },
    ],
    additionalRequirements: [
      {
        key: 'paperGsm',
        label: 'Paper GSM (Thickness)',
        labelHindi: 'कागज़ की मोटाई (Paper GSM)',
        type: 'select',
        options: ['80 GSM (Lightweight bakery / pharmacy)', '100 GSM (Standard grocery & delivery)', '120 GSM (Retail & apparel shopping)', '150 GSM (Heavyweight boutique)', '180 GSM (Rigid laminated tote)'],
        defaultValue: '120 GSM (Retail & apparel shopping)',
      },
      {
        key: 'handleType',
        label: 'Handle Type & Material',
        labelHindi: 'हैंडल का प्रकार (Handle Type)',
        type: 'select',
        options: ['Twisted Paper Cord (ट्विस्टेड पेपर डोरी)', 'Flat Folded Paper (फ्लैट फोल्डेड पेपर)', 'Cotton Braided Rope (सूती डोरी)', 'Satin Ribbon (रेशमी रिबन)', 'D-Cut Punch Hole (D-कट पंच)'],
        defaultValue: 'Twisted Paper Cord (ट्विस्टेड पेपर डोरी)',
      },
      {
        key: 'bottomReinforcement',
        label: 'Bottom Reinforcement Board',
        labelHindi: 'तली में गत्ता सपोर्ट (Bottom Cardboard)',
        type: 'select',
        options: ['Heavy Greyboard Base Insert (नीचे गत्ता लगा हुआ)', 'Top Turnover Cardboard Only (ऊपर कॉलर सपोर्ट)', 'Both Top & Bottom Reinforced (ऊपर और नीचे दोनों)', 'No Reinforcement (साधारण)'],
        defaultValue: 'Heavy Greyboard Base Insert (नीचे गत्ता लगा हुआ)',
      },
      {
        key: 'weightCapacityKg',
        label: 'Weight Bearing Capacity',
        labelHindi: 'वजन उठाने की क्षमता (Weight Capacity)',
        type: 'select',
        options: ['2 - 3 Kg (Light pharmacy / bakery)', '5 - 7 Kg (Standard apparel / shopping)', '8 - 10 Kg (Heavy groceries & shoeboxes)', '12+ Kg (Extra reinforced export)'],
        defaultValue: '5 - 7 Kg (Standard apparel / shopping)',
      },
      {
        key: 'isFoodGrade',
        label: 'Food Grade & Grease Resistant Certified',
        labelHindi: 'फूड ग्रेड प्रमाणन (Food Grade Safe)',
        type: 'boolean',
        defaultValue: false,
        hint: 'Safe for direct bakery & takeaway food contact',
        hintHindi: 'खाने-पीने के सीधे संपर्क के लिए सुरक्षित',
      },
    ],
  },

  duplex_box: {
    id: 'duplex_box',
    title: 'Duplex Boxes (Printed & Folding Cartons)',
    titleHindi: 'डुप्लेक्स बॉक्स (Duplex Board Cartons)',
    shortDesc: 'Coated duplex board with grey back, FBB, SBS, perfume & food packaging',
    icon: 'Layers',
    defaultUnitName: 'box',
    defaultUnitNameHindi: 'बॉक्स',
    defaultRate: 18,
    defaultQuantity: 4000,
    subCategories: [
      {
        id: 'grey_back',
        title: 'Duplex Board with Grey Back (HWC / LWC)',
        titleHindi: 'डुप्लेक्स बोर्ड ग्रे बैक (Grey Back - सबसे प्रचलित)',
        description: 'Coated printable top face with recycled grey back for sweet boxes, FMCG & toys',
        descriptionHindi: 'ऊपर सफेद प्रिंटिंग और पीछे स्लेटी गत्ता (मिठाई, खिलौने, अगरबत्ती)',
      },
      {
        id: 'white_back',
        title: 'Duplex Board with White Back (Premium)',
        titleHindi: 'डुप्लेक्स बोर्ड व्हाइट बैक (White Back Coated)',
        description: 'Both sides white appearance for clean cosmetic, garment & luxury items',
        descriptionHindi: 'अंदर और बाहर दोनों तरफ सफेद फिनिश (कपड़े व कॉस्मेटिक)',
      },
      {
        id: 'fbb_board',
        title: 'Folding Box Board (FBB / GC1 / GC2)',
        titleHindi: 'FBB वर्जिन बोर्ड (Folding Box Board)',
        description: 'Virgin chemical pulp board with superior stiffness and bright white color for pharma',
        descriptionHindi: 'दवाइयों और परफ्यूम के लिए एक्स्ट्रा चमकदार व कड़क वर्जिन बोर्ड',
      },
      {
        id: 'sbs_board',
        title: 'Solid Bleached Sulfate (SBS Board)',
        titleHindi: 'SBS बोर्ड (Solid Bleached Sulfate - सुपर लक्ज़री)',
        description: 'Premium pure white bleached board for high-end beauty, chocolates & electronics',
        descriptionHindi: 'इंटरनेशनल क्वालिटी चॉकलेट और ब्यूटी बॉक्स के लिए',
      },
      {
        id: 'food_poly_duplex',
        title: 'Food Grade Poly-Coated Duplex Box',
        titleHindi: 'फूड ग्रेड पॉली-कोटेड डुप्लेक्स (Oil Proof)',
        description: 'Inner PE coating to prevent oil and liquid seepage for restaurant sweets & snacks',
        descriptionHindi: 'अंदर प्लास्टिक कोटिंग ताकि घी या तेल बाहर न निकले',
      },
      {
        id: 'metpet_foil',
        title: 'MetPET Silver / Gold Foil Laminated Duplex',
        titleHindi: 'मेटपैट सिल्वर / गोल्ड फॉयल बॉक्स (Shining Metal)',
        description: 'Metallic mirror finish foil laminated for festive gift packaging and liquor',
        descriptionHindi: 'चमकदार सोने या चांदी जैसा फॉयल बॉक्स (त्योहारों व ड्राई फ्रूट्स)',
      },
    ],
    additionalRequirements: [
      {
        key: 'boardGsm',
        label: 'Board GSM / Caliper',
        labelHindi: 'गत्ते का जीएसएम (Board GSM)',
        type: 'select',
        options: ['250 GSM (Lightweight small cartons)', '300 GSM (Standard pharma & retail boxes)', '350 GSM (Rigid sweet & garment boxes)', '400 GSM (Heavy packaging cartons)', '450 GSM (Extra thick heavy duty)'],
        defaultValue: '350 GSM (Rigid sweet & garment boxes)',
      },
      {
        key: 'surfaceFinish',
        label: 'Surface Coating / Finish',
        labelHindi: 'ऊपरी फिनिश / लेमिनेशन (Surface Finish)',
        type: 'select',
        options: ['Gloss Thermal Lamination (चमकदार लेमिनेशन)', 'Matt Thermal Lamination (मैट लेमिनेशन)', 'Drip-Off Hybrid UV (ड्रिप-ऑफ यूवी)', 'Spot UV on Brand Name (स्पॉट यूवी)', 'Aqueous Varnish (वॉटर बेस्ड वार्निश)', 'None (साधारण अनकोटेड)'],
        defaultValue: 'Gloss Thermal Lamination (चमकदार लेमिनेशन)',
      },
      {
        key: 'windowPatching',
        label: 'Window Patching (PVC / PET Film)',
        labelHindi: 'पारदर्शी खिड़की (Window Patching)',
        type: 'select',
        options: ['No Window (बिना खिड़की)', 'Clear PET Film Window (पारदर्शी प्लास्टिक फिल्म लगी हुई)', 'Open Die-Cut Cutout (खुला कट-आउट)'],
        defaultValue: 'No Window (बिना खिड़की)',
      },
      {
        key: 'pastingLockType',
        label: 'Pasting & Bottom Lock Style',
        labelHindi: 'पेस्टिंग व लॉक का प्रकार (Lock Style)',
        type: 'select',
        options: ['Crash Lock Auto Bottom (ऑटो लॉक बॉटम)', 'Straight Tuck End - STE (साधारण फोल्डिंग लॉक)', 'Reverse Tuck End - RTE (उल्टा लॉक)', 'Side Seam Glued (साइड गम पेस्टिंग)', '4-Corner Beers Tray (ट्रे स्टाइल)'],
        defaultValue: 'Crash Lock Auto Bottom (ऑटो लॉक बॉटम)',
      },
      {
        key: 'embossingFoil',
        label: 'Embossing / Foil Stamping',
        labelHindi: 'उभार व गोल्ड फॉयल (Embossing / Foil)',
        type: 'select',
        options: ['None (कोई नहीं)', 'Gold Hot Foil Stamping (सोने की पन्नी स्टैम्पिंग)', 'Silver Hot Foil Stamping (चांदी की पन्नी)', '3D Embossing on Logo (लोगो पर उभार)', 'Foil + 3D Embossing Combined'],
        defaultValue: 'None (कोई नहीं)',
      },
    ],
  },

  non_woven_bag: {
    id: 'non_woven_bag',
    title: 'Non Woven Bags (Eco Carry Bags)',
    titleHindi: 'नॉन-वोवन बैग (Non-Woven Bags)',
    shortDesc: 'D-cut, W-cut U-cut bags, 3D box loop handle bags & ultrasonic welded carriers',
    icon: 'Briefcase',
    defaultUnitName: 'bag',
    defaultUnitNameHindi: 'बैग',
    defaultRate: 9.5,
    defaultQuantity: 5000,
    subCategories: [
      {
        id: 'd_cut_non_woven',
        title: 'D-Cut Non Woven Carry Bag',
        titleHindi: 'D-कट नॉन वोवन थैला (D-Cut Carry Bag)',
        description: 'Punched hand grip carry bag widely used in retail cloth stores & shoe outlets',
        descriptionHindi: 'कपड़े और जूतों की दुकान के लिए D-कट पंच वाला थैला',
      },
      {
        id: 'w_cut_grocery',
        title: 'W-Cut / U-Cut (T-Shirt Style) Grocery Bag',
        titleHindi: 'W-कट / U-कट वेस्ट बैग (T-Shirt Grocery)',
        description: 'High capacity grocery bag with side gussets mimicking traditional plastic vest bags',
        descriptionHindi: 'सब्जी मंडी व किराना के लिए साइड से खुलने वाला U/W कट बैग',
      },
      {
        id: '3d_box_loop',
        title: '3D Box Bag with Loop Handle',
        titleHindi: '3D बॉक्स लूप हैंडल बैग (Box Type 3D)',
        description: 'Box shaped standing bag with stitched or ultrasonic welded loop handle and base gusset',
        descriptionHindi: 'स्वीट बॉक्स और कपड़ों के डिब्बे रखने के लिए चौकोर 3D बैग',
      },
      {
        id: 'zipper_bag',
        title: 'Zipper Non Woven Garment Bag',
        titleHindi: 'ज़िपर साड़ी व सूट कवर (Zipper Garment Cover)',
        description: 'Protective dust cover with nylon zipper for sarees, suits and blazers',
        descriptionHindi: 'साड़ी और कोट-पेंट रखने के लिए चैन वाला कवर',
      },
      {
        id: 'ultrasonic_sealed',
        title: 'Ultrasonic Heat-Sealed Flat Bag',
        titleHindi: 'अल्ट्रासोनिक सील्ड फ्लैट बैग (Fully Machine Made)',
        description: 'High speed machine sealed bag without thread stitching for exhibitions & events',
        descriptionHindi: 'बिना सिलाई का मशीन से सील किया हुआ इवेंट बैग',
      },
      {
        id: 'stitched_saree',
        title: 'Heavy Duty Stitched Shopping Bag',
        titleHindi: 'मजबूत सिलाई वाला हैवी बैग (Stitched Heavy Duty)',
        description: 'Nylon thread double stitched bag capable of carrying 15+ kg heavy items',
        descriptionHindi: '15 किलो से ज्यादा वजन उठाने के लिए सिलाई वाला मजबूत थैला',
      },
    ],
    additionalRequirements: [
      {
        key: 'fabricGsm',
        label: 'Fabric GSM (Fabric Thickness)',
        labelHindi: 'कपड़े की मोटाई (Fabric GSM)',
        type: 'select',
        options: ['45 GSM (Budget light packing)', '60 GSM (Standard retail carry bag)', '75 GSM (Premium durable bag)', '90 GSM (Heavy duty reusable)', '100+ GSM (Extra strong export grade)'],
        defaultValue: '60 GSM (Standard retail carry bag)',
      },
      {
        key: 'fabricColor',
        label: 'Fabric Color',
        labelHindi: 'कपड़े का रंग (Fabric Color)',
        type: 'select',
        options: ['Natural White (सफेद)', 'Royal Blue (नीला)', 'Bright Yellow (पीला)', 'Apple Green (हरा)', 'Blood Red (लाल)', 'Jet Black (काला)', 'Orange (नारंगी)', 'Maroon (मैरून)', 'Custom Dyed Color'],
        defaultValue: 'Royal Blue (नीला)',
      },
      {
        key: 'sealingMethod',
        label: 'Sealing & Joining Technology',
        labelHindi: 'सीलिंग का प्रकार (Sealing Method)',
        type: 'select',
        options: ['Ultrasonic Heat Welded (मशीन से अल्ट्रासोनिक वेल्डिंग)', 'Thread Stitched (नायलॉन धागे से सिलाई)', 'Cross-Stitched Reinforcement on Handles'],
        defaultValue: 'Ultrasonic Heat Welded (मशीन से अल्ट्रासोनिक वेल्डिंग)',
      },
      {
        key: 'handleLength',
        label: 'Loop Handle Length & Color',
        labelHindi: 'हैंडल की लंबाई व रंग (Handle Specs)',
        type: 'select',
        options: ['14 inch Matching Color Loop (14 इंच मैचिंग हैंडल)', '16 inch Contrast Color Loop (16 इंच अलग रंग का हैंडल)', 'Built-in D-Cut Oval Grip (D-कट ग्रिप)', 'Long Shoulder Strap (कंधे पर टांगने वाला)'],
        defaultValue: '14 inch Matching Color Loop (14 इंच मैचिंग हैंडल)',
      },
      {
        key: 'printingTechnique',
        label: 'Printing Technique',
        labelHindi: 'प्रिंटिंग का तरीका (Printing Technique)',
        type: 'select',
        options: ['Screen Printing Single Color (स्क्रीन प्रिंटिंग 1 कलर)', 'Screen Printing 2-Color Front & Back', 'Rotogravure Multi-Color Roll Print (रोटोग्रेव्योर फुल कलर)', 'Plain Unprinted (बिना प्रिंट का)'],
        defaultValue: 'Screen Printing Single Color (स्क्रीन प्रिंटिंग 1 कलर)',
      },
    ],
  },

  cake_base: {
    id: 'cake_base',
    title: 'Cake Base (Boards & Thick Drums)',
    titleHindi: 'केक बेस / केक बोर्ड (Cake Base)',
    shortDesc: 'Round metallic cake boards, square bases, 12mm thick drums & greaseproof pads',
    icon: 'Disc',
    defaultUnitName: 'base',
    defaultUnitNameHindi: 'पीस',
    defaultRate: 22,
    defaultQuantity: 2000,
    subCategories: [
      {
        id: 'round_metallic',
        title: 'Round Metallic Gold / Silver Cake Board',
        titleHindi: 'गोल मेटैलिक गोल्ड / सिल्वर बेस (Round Board)',
        description: 'Standard round board with embossed foil for birthday & bakery cakes (0.5kg - 2kg)',
        descriptionHindi: 'गोल आकार का सोने या चांदी के फॉयल वाला केक बेस',
      },
      {
        id: 'square_board',
        title: 'Square / Rectangular Cake Board',
        titleHindi: 'चौकोर / आयताकार केक बोर्ड (Square Board)',
        description: 'Clean right-angle square board for square sheet cakes and corporate desserts',
        descriptionHindi: 'चौकोर पेस्ट्री और शीट केक के लिए मजबूत बेस',
      },
      {
        id: 'cake_drum_12mm',
        title: 'Thick Luxury Cake Drum (12mm / 0.5 inch)',
        titleHindi: 'मोटा लक्ज़री केक ड्रम (12mm Heavy Drum)',
        description: 'Heavyweight 12mm thick edge-turned drum for tiered wedding cakes and grand celebrations',
        descriptionHindi: 'शादी के बड़े व भारी 3-मंजिला केक के लिए 12mm मोटा ड्रम',
      },
      {
        id: 'mdf_hardboard',
        title: 'MDF High-Density Hardboard Cake Base',
        titleHindi: 'MDF हार्डबोर्ड केक बेस (Zero Bend Hardboard)',
        description: 'Engineered moisture-resistant wood fiber board with 0% bending under heavy cakes',
        descriptionHindi: 'लकड़ी के मजबूत बुरादे (MDF) से बना न मुड़ने वाला बेस',
      },
      {
        id: 'scalloped_flower',
        title: 'Scalloped Decorative Flower Edge Base',
        titleHindi: 'स्कैलप्ड डिज़ाइनर बॉर्डर बेस (Scalloped Edge)',
        description: 'Floral curved scalloped rim for festive designer pastries and celebration cakes',
        descriptionHindi: 'किनारों पर फूलों की कटिंग वाला सजावटी केक बेस',
      },
      {
        id: 'corrugated_pad',
        title: 'Corrugated Oil-Resistant Pad',
        titleHindi: 'कोरुगेटेड ऑयल-रेसिस्टेंट पैड (Light Base)',
        description: 'Cost-effective fluted corrugated board with oil-repellent metallized film',
        descriptionHindi: 'सस्ता और हल्का कोरुगेटेड बेस रोजमर्रा की बेकरी के लिए',
      },
    ],
    additionalRequirements: [
      {
        key: 'baseSizeDiameter',
        label: 'Base Size / Diameter',
        labelHindi: 'साइज / व्यास (Base Diameter)',
        type: 'select',
        options: ['6 inch / 150 mm (0.5 kg mini cake)', '8 inch / 200 mm (1 kg regular cake)', '10 inch / 250 mm (1.5 - 2 kg celebration cake)', '12 inch / 300 mm (2 - 3 kg party cake)', '14 inch / 350 mm (Multi-tier wedding cake)', '16 inch / 400 mm (Grand banquet cake)'],
        defaultValue: '10 inch / 250 mm (1.5 - 2 kg celebration cake)',
      },
      {
        key: 'thicknessMm',
        label: 'Base Thickness',
        labelHindi: 'मोटाई (Thickness)',
        type: 'select',
        options: ['1.5 mm (Lightweight standard board)', '3.0 mm (Rigid double-wall board)', '6.0 mm (Semi-drum reinforced)', '12 mm / 0.5 inch (Luxury heavy cake drum)'],
        defaultValue: '3.0 mm (Rigid double-wall board)',
      },
      {
        key: 'surfaceFoil',
        label: 'Surface Foil Finish',
        labelHindi: 'फॉयल का रंग व फिनिश (Surface Foil)',
        type: 'select',
        options: ['Embossed Metallic Gold (उभरा हुआ सोना)', 'Embossed Glossy Silver (उभरी हुई चांदी)', 'Matte Black Luxury (शाही मैट ब्लैक)', 'Glossy White Greaseproof (सादा सफेद ऑयलरहित)', 'Rose Gold Metallic (रोज गोल्ड)', 'Marble Pattern Printed (मार्बल प्रिंट)'],
        defaultValue: 'Embossed Metallic Gold (उभरा हुआ सोना)',
      },
      {
        key: 'edgeFinish',
        label: 'Edge Treatment',
        labelHindi: 'किनारों की फिनिश (Edge Finish)',
        type: 'select',
        options: ['Smooth Turned Edge (मुड़ा हुआ चिकना किनारा - बेस्ट)', 'Clean Die-Cut Edge (साधारण कट किनारा)', 'Scalloped Floral Border (डिज़ाइनर स्कैलप कट)'],
        defaultValue: 'Smooth Turned Edge (मुड़ा हुआ चिकना किनारा - बेस्ट)',
      },
      {
        key: 'isGreaseProof',
        label: '100% Grease & Moisture Proof Certified',
        labelHindi: 'घी व क्रीम से सुरक्षित (Greaseproof)',
        type: 'boolean',
        defaultValue: true,
        hint: 'Food grade film prevents cream or oil from softening the core',
        hintHindi: 'क्रीम या तेल गत्ते में नहीं सोखेगा',
      },
    ],
  },

  plastic_container: {
    id: 'plastic_container',
    title: 'Plastic Container (Food Takeaway & Deli)',
    titleHindi: 'प्लास्टिक कंटेनर (Plastic Containers)',
    shortDesc: 'Microwave meal prep bowls, transparent takeaway tubs, clamshells & deli boxes',
    icon: 'Coffee',
    defaultUnitName: 'container',
    defaultUnitNameHindi: 'डिब्बा',
    defaultRate: 8.5,
    defaultQuantity: 5000,
    subCategories: [
      {
        id: 'round_bowl',
        title: 'Round Meal Prep Bowl with Lid',
        titleHindi: 'गोल मील बाउल ढक्कन सहित (Round Bowl with Lid)',
        description: 'Microwave-safe round bowl with snap-fit leak-resistant lid for curries, rice & soups',
        descriptionHindi: 'सब्जी, दाल और बिरयानी के लिए लीक-प्रूफ गोल डिब्बा',
      },
      {
        id: 'rectangular_takeaway',
        title: 'Rectangular Takeaway Container',
        titleHindi: 'आयताकार टेकअवे डिब्बा (Rectangular Box)',
        description: 'Standard rectangular food box with clear lid for restaurant delivery & meal combos',
        descriptionHindi: 'रेस्टोरेंट और क्लाउड किचन के लिए चौकोर भोजन डिब्बा',
      },
      {
        id: 'hinged_clamshell',
        title: 'Hinged Clamshell Clear Container',
        titleHindi: 'जुड़ा हुआ ढक्कन क्लैमशेल (Hinged Clamshell)',
        description: 'One-piece container with attached folding lid for sandwiches, salads & burgers',
        descriptionHindi: 'जुड़े हुए ढक्कन वाला डिब्बा (सैंडविच, बर्गर, सलाद)',
      },
      {
        id: 'tamper_evident_tub',
        title: 'Tamper-Evident Deli Round Tub',
        titleHindi: 'सील-बंद डेलि टब (Tamper Evident Seal)',
        description: 'Tear-strip security seal rim ensuring freshness for ice cream, dips, sweets & sauces',
        descriptionHindi: 'तोड़ने वाली सील वाला डिब्बा - पहली बार ग्राहक ही खोलेगा',
      },
      {
        id: 'bakery_sweet_box',
        title: 'Bakery & Sweet Box Transparent Container',
        titleHindi: 'मिठाई व पेस्ट्री डिब्बा (Bakery Sweet Box)',
        description: 'Crystal clear rigid box for kaju katli, dry fruits, muffins & cookies',
        descriptionHindi: 'काजू कतली, कुकीज और बेकरी के लिए शीशे जैसा पारदर्शी डिब्बा',
      },
      {
        id: 'portion_sauce_cup',
        title: 'Portion & Sauce Cup with Snap Lid',
        titleHindi: 'चटनी व सॉस कप (Portion Sauce Cup)',
        description: 'Small 50ml - 100ml leak-proof condiment cup for chutneys, dips and raita',
        descriptionHindi: 'चटनी, रायता और अचार के लिए छोटा 50ml-100ml कप',
      },
    ],
    additionalRequirements: [
      {
        key: 'capacityMl',
        label: 'Volume / Capacity (ml)',
        labelHindi: 'क्षमता / आयतन (Volume in ml)',
        type: 'select',
        options: ['100 ml (Chutney / dip)', '250 ml (Small dessert / side)', '500 ml (Standard curry / dal)', '650 ml (Medium biryani / noodles)', '750 ml (Standard family portion)', '1000 ml / 1 Liter (Large combo)', '1200 ml (Jumbo banquet pack)'],
        defaultValue: '750 ml (Standard family portion)',
      },
      {
        key: 'materialGrade',
        label: 'Raw Material Grade',
        labelHindi: 'प्लास्टिक की क्वालिटी (Material Grade)',
        type: 'select',
        options: ['PP - Polypropylene (Microwave Safe 120°C & Food Virgin)', 'PET - Ultra Clear (Cold Foods & Salads only up to 60°C)', 'PS - Polystyrene (Rigid Bakery Grade)', 'Bio-Degradable Cornstarch Blend'],
        defaultValue: 'PP - Polypropylene (Microwave Safe 120°C & Food Virgin)',
      },
      {
        key: 'compartments',
        label: 'Number of Compartments',
        labelHindi: 'खानों की संख्या (Compartments)',
        type: 'select',
        options: ['Single Compartment (साधारण 1 खाना)', '2-Compartment (2 खाने - दाल चावल)', '3-Compartment (3 खाने - थाली मील ट्रे)', '4-Compartment Bento (4 खाने - कॉम्बो)', '5-Compartment Executive Thali (5 खाने)'],
        defaultValue: 'Single Compartment (साधारण 1 खाना)',
      },
      {
        key: 'containerColor',
        label: 'Container Base & Lid Color',
        labelHindi: 'डिब्बे और ढक्कन का रंग (Color Scheme)',
        type: 'select',
        options: ['Black Base + Clear Anti-Fog Lid (काला बेस + पारदर्शी ढक्कन - प्रीमियम)', 'All Clear Transparent (पूरा शीशे जैसा पारदर्शी)', 'Translucent Milky White (हल्का सफेद)', 'Custom Brand Colored Base'],
        defaultValue: 'Black Base + Clear Anti-Fog Lid (काला बेस + पारदर्शी ढक्कन - प्रीमियम)',
      },
      {
        key: 'lidSealType',
        label: 'Lid Closure & Seal Type',
        labelHindi: 'ढक्कन की फिटिंग (Lid Seal Type)',
        type: 'select',
        options: ['Leak-Proof Snap-Fit Rim (दबाकर बंद होने वाला लीक-प्रूफ)', 'Heat Sealable Rim - No Lid (मशीन से पन्नी सील करने वाला)', 'Tamper Evident Tear Strip (सील तोड़कर खुलने वाला)', 'Hinged Connected Lid (जुड़ा हुआ ढक्कन)'],
        defaultValue: 'Leak-Proof Snap-Fit Rim (दबाकर बंद होने वाला लीक-प्रूफ)',
      },
    ],
  },
};

export const PRODUCT_LIST: ProductCatalogItem[] = Object.values(PRODUCT_CATALOG);

export function getProductCatalogItem(type?: ProductType): ProductCatalogItem {
  if (!type || !PRODUCT_CATALOG[type]) {
    return PRODUCT_CATALOG.paper_box;
  }
  return PRODUCT_CATALOG[type];
}

export function formatProductSpecsSummary(order: CorrugatedOrder): string {
  const product = getProductCatalogItem(order.productType);
  const subCategoryName = order.productSubCategory || product.subCategories[0]?.title || 'Standard';

  if (!order.productType || order.productType === 'paper_box') {
    return `${order.ply} ${order.flute.split(' ')[0]} | ${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm}mm | T:${order.paperSpecs.topLinerGsm}g/F:${order.paperSpecs.flutingMediumGsm}g/B:${order.paperSpecs.bottomLinerGsm}g | ${order.lamination || 'None'}`;
  }

  const reqs = order.productRequirements || {};

  if (order.productType === 'paper_bag') {
    const gsm = reqs.paperGsm ? reqs.paperGsm.split(' ')[0] : '120';
    const handle = reqs.handleType ? reqs.handleType.split('(')[0].trim() : 'Twisted Paper';
    return `${subCategoryName} | ${order.dimensions.lengthMm}(H) x ${order.dimensions.widthMm}(W) x ${order.dimensions.heightMm}(G) mm | ${gsm} GSM | ${handle}`;
  }

  if (order.productType === 'duplex_box') {
    const boardGsm = reqs.boardGsm ? reqs.boardGsm.split(' ')[0] : '350';
    const finish = reqs.surfaceFinish ? reqs.surfaceFinish.split('(')[0].trim() : (order.lamination || 'Gloss');
    return `${subCategoryName} | ${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm}mm | ${boardGsm} GSM | ${finish}`;
  }

  if (order.productType === 'non_woven_bag') {
    const fabricGsm = reqs.fabricGsm ? reqs.fabricGsm.split(' ')[0] : '60';
    const color = reqs.fabricColor ? reqs.fabricColor.split('(')[0].trim() : 'Royal Blue';
    const sealing = reqs.sealingMethod ? reqs.sealingMethod.split('(')[0].trim() : 'Ultrasonic';
    return `${subCategoryName} | ${order.dimensions.lengthMm}x${order.dimensions.widthMm}mm | ${fabricGsm} GSM | ${color} | ${sealing}`;
  }

  if (order.productType === 'cake_base') {
    const size = reqs.baseSizeDiameter ? reqs.baseSizeDiameter.split('(')[0].trim() : '10 inch';
    const thickness = reqs.thicknessMm ? reqs.thicknessMm.split('(')[0].trim() : '3.0 mm';
    const foil = reqs.surfaceFoil ? reqs.surfaceFoil.split('(')[0].trim() : 'Gold Foil';
    return `${subCategoryName} | ${size} | ${thickness} | ${foil}`;
  }

  if (order.productType === 'plastic_container') {
    const capacity = reqs.capacityMl ? reqs.capacityMl.split('(')[0].trim() : '750 ml';
    const compartments = reqs.compartments ? reqs.compartments.split('(')[0].trim() : '1-CP';
    const material = reqs.materialGrade ? reqs.materialGrade.split(' ')[0] : 'PP';
    return `${subCategoryName} | ${capacity} | ${material} (${compartments})`;
  }

  return `${subCategoryName} | ${order.dimensions.lengthMm}x${order.dimensions.widthMm}x${order.dimensions.heightMm}mm`;
}
