import React, { useState } from 'react';
import { CorrugatedOrder, FactorySettings } from '../types/order';
import { formatDateTime, STAGE_CONFIG } from '../utils/whatsapp';
import { getProductCatalogItem, formatProductSpecsSummary } from '../utils/productCatalog';
import { OrderQRCode } from './OrderQRCode';
import { X, Printer, FileText, Tag, Check, ArrowRight } from 'lucide-react';

interface JobCardPrintModalProps {
  order: CorrugatedOrder;
  settings: FactorySettings;
  isOpen: boolean;
  onClose: () => void;
}

export const JobCardPrintModal: React.FC<JobCardPrintModalProps> = ({
  order,
  settings,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [printFormat, setPrintFormat] = useState<'standard' | 'thermal'>('standard');

  const handlePrintToPdf = () => {
    // Uses window.print() API
    window.print();
  };

  // Standard corrugated calculations for sheet cut size approximation
  const l = order.dimensions.lengthMm;
  const w = order.dimensions.widthMm;
  const h = order.dimensions.heightMm;
  const approxSheetLength = 2 * (l + w) + 40; // with joint flap
  const approxSheetWidth = w + h + 10; // with flap creasing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
        {/* Header toolbar - Completely hidden in print */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 no-print space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-amber-400 font-semibold uppercase">
                Plant Floor Document Center
              </span>
              <h2 className="text-base font-bold text-white">
                Job Card & Converting Order #{order.id}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrintToPdf}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print to PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printer Format Switcher & PDF helper notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Layout Format:</span>
              <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPrintFormat('standard')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    printFormat === 'standard'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Standard A4 / Work Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    printFormat === 'thermal'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Thermal Label (4" x 6")</span>
                </button>
              </div>
            </div>

            <span className="text-[11px] text-neutral-400 font-mono">
              💡 Select <strong className="text-neutral-200">"Save as PDF"</strong> in the print dialog to export a PDF file.
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Printable Document Root (Only this is visible when printing) */}
        {/* ======================================================== */}
        <div id="printable-job-card-root" className="bg-white text-neutral-950 font-sans">
          {printFormat === 'standard' ? (
            /* ==================================================== */
            /* Standard A4 / Letter Work Order Document Layout      */
            /* ==================================================== */
            <div className="p-8 space-y-6 text-xs bg-white text-neutral-900 printable-job-card">
              {/* Company & Order Header */}
              <div className="border-b-2 border-neutral-900 pb-4 flex justify-between items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                    {settings.companyName.toUpperCase()}
                  </h1>
                  <div className="text-[11px] text-neutral-600 max-w-md mt-0.5">
                    {settings.plantAddress}
                  </div>
                  <div className="text-[11px] text-neutral-600 font-mono">
                    Phone: {settings.contactNumber}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono tracking-tight text-neutral-900">
                      JOB CARD #{order.id}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-700">
                      Booked: {formatDateTime(order.orderDate)}
                    </div>
                    <div className="text-xs font-bold font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mt-1">
                      DISPATCH SLA: {formatDateTime(order.expectedDeliveryDate)}
                    </div>
                  </div>

                  {/* Scannable Order QR Code on the physical job card */}
                  <div className="shrink-0 pl-3 border-l border-neutral-200">
                    <OrderQRCode
                      orderId={order.id}
                      size={76}
                      lightMode={true}
                      label="Scan to Track"
                    />
                  </div>
                </div>
              </div>

              {/* Product Type Banner */}
              <div className="bg-amber-100 border border-amber-300 p-2.5 rounded flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-900 uppercase">Manufacturing Product:</span>
                  <span className="text-sm font-bold text-neutral-900 ml-2">
                    {getProductCatalogItem(order.productType).title} ({getProductCatalogItem(order.productType).titleHindi})
                  </span>
                  {order.productSubCategory && (
                    <span className="text-xs text-neutral-700 block mt-0.5">
                      <strong>Subcategory (प्रकार):</strong> {order.productSubCategory}
                    </span>
                  )}
                </div>
                <div className="text-right text-[11px] font-mono text-amber-950 font-bold">
                  Machine: {order.assignedLine || 'Main Converting Line'}
                </div>
              </div>

              {/* Client & Priority Bar */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-100 p-3 rounded">
                <div>
                  <span className="font-semibold text-neutral-600 text-[10px] uppercase">Client / Consignee (पार्टी का नाम):</span>
                  <div className="text-sm font-bold text-neutral-900">{order.customerCompany}</div>
                  <div className="text-neutral-700">{order.customerName} ({order.customerPhone})</div>
                  <div className="text-neutral-600 text-[11px]">{order.deliveryAddress}</div>
                  {order.salesPersonName && (
                    <div className="text-[11px] text-purple-800 font-semibold mt-1">
                      Account Manager: {order.salesPersonName} ({order.salesPersonPhone})
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <div>
                    <span className="font-semibold text-neutral-600 text-[10px] uppercase">Batch Priority (प्राथमिकता): </span>
                    <span className="font-bold text-neutral-900">{order.priority}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-600 text-[10px] uppercase">Allocated Machine: </span>
                    <span className="font-mono font-bold text-neutral-900">{order.assignedLine || 'Line 1'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-600 text-[10px] uppercase">Order Qty (मात्रा): </span>
                    <span className="text-base font-bold font-mono text-neutral-900">{order.quantity.toLocaleString()} {order.productType ? getProductCatalogItem(order.productType).defaultUnitName.toUpperCase() : 'PCS'}</span>
                    <span className="text-neutral-600 text-[11px]"> ({order.bundlesCount} Bundles / Pkg)</span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              <div>
                <div className="font-bold text-neutral-900 text-xs uppercase border-b border-neutral-300 pb-1 mb-2">
                  1. Cardboard & Flute Engineering Specifications
                </div>

                <table className="w-full border-collapse border border-neutral-300 text-left text-xs">
                  <tbody>
                    <tr className="border-b border-neutral-300">
                      <td className="p-2 bg-neutral-50 font-semibold w-1/4 border-r border-neutral-300">Box Style</td>
                      <td className="p-2 font-medium w-1/4 border-r border-neutral-300">{order.boxStyle}</td>
                      <td className="p-2 bg-neutral-50 font-semibold w-1/4 border-r border-neutral-300">Wall / Ply Structure</td>
                      <td className="p-2 font-bold w-1/4">{order.ply}</td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Inside Dimensions</td>
                      <td className="p-2 font-mono font-bold border-r border-neutral-300">
                        {order.dimensions.lengthMm} x {order.dimensions.widthMm} x {order.dimensions.heightMm} mm
                        <span className="text-[10px] font-normal text-neutral-600 block">
                          ({(order.dimensions.lengthMm / 25.4).toFixed(1)}" x {(order.dimensions.widthMm / 25.4).toFixed(1)}" x {(order.dimensions.heightMm / 25.4).toFixed(1)}")
                        </span>
                      </td>
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Flute Wave Profile</td>
                      <td className="p-2 font-medium">{order.flute}</td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Est. Blank Sheet Size</td>
                      <td className="p-2 font-mono border-r border-neutral-300">
                        {approxSheetLength} mm x {approxSheetWidth} mm
                      </td>
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Joint Assembly Type</td>
                      <td className="p-2 font-medium">{order.jointType}</td>
                    </tr>
                    <tr className="border-b border-neutral-300">
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Paper GSM Combination</td>
                      <td className="p-2 font-mono border-r border-neutral-300">
                        Top {order.paperSpecs.topLinerGsm} / Med {order.paperSpecs.flutingMediumGsm} / Bot {order.paperSpecs.bottomLinerGsm}
                        {order.paperSpecs.middleLinerGsm ? ` / Mid ${order.paperSpecs.middleLinerGsm}` : ''} GSM
                      </td>
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Target Bursting Factor</td>
                      <td className="p-2 font-mono font-bold">{order.paperSpecs.burstingFactor} BF</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Lamination Finish</td>
                      <td className="p-2 font-bold text-neutral-900 border-r border-neutral-300">{order.lamination || 'None'}</td>
                      <td className="p-2 bg-neutral-50 font-semibold border-r border-neutral-300">Printing Method</td>
                      <td className="p-2 font-medium">{order.colorType || 'Plain'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Printing & Finishing Instructions */}
              <div>
                <div className="font-bold text-neutral-900 text-xs uppercase border-b border-neutral-300 pb-1 mb-2">
                  2. Printing, Branding & Packaging Instructions
                </div>
                <div className="p-3 border border-neutral-300 rounded space-y-1.5">
                  <div>
                    <span className="font-semibold text-neutral-700">Printing Spec: </span>
                    <span className="font-medium text-neutral-900">{order.printingDetails}</span>
                  </div>
                  {order.logoDetails?.hasLogo && (
                    <div>
                      <span className="font-semibold text-neutral-700">Logo & Artwork: </span>
                      <span className="font-bold text-neutral-900">{order.logoDetails.brandName || order.customerCompany}</span>
                      <span className="text-neutral-600"> ({order.logoDetails.logoPlacement || 'Front & Back'} · Status: {order.logoDetails.artworkStatus || 'Approved'})</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-neutral-700">Bundling & Palletization: </span>
                    <span>25 boxes strapped per bundle with plastic edge protectors. Pallet stretch wrapped.</span>
                  </div>
                </div>
              </div>

              {/* Shopfloor Hindi Instructions */}
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-neutral-800 text-xs leading-relaxed">
                <span className="font-bold text-amber-900 block mb-0.5">कारखाना निर्देश (Shopfloor Instructions):</span>
                <span>उत्पादन सुपरवाइजर व मशीन ऑपरेटर ध्यान दें — मशीन चलाने से पहले पहला सैंपल साइज, प्रिंटिंग और क्रीजिंग पास कराएं। पूरा माल तैयार होने पर बंडल गिनती करके ही डिस्पैच यार्ड में रखें।</span>
              </div>

              {/* Quality Assurance & Operator Sign-off */}
              <div>
                <div className="font-bold text-neutral-900 text-xs uppercase border-b border-neutral-300 pb-1 mb-2">
                  3. Quality Checkpoints & Stage Sign-Off
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="border border-neutral-300 p-2 rounded">
                    <div className="font-semibold">Corrugator Check</div>
                    <div className="text-neutral-500 mt-1">Pasting & Flute Height</div>
                    <div className="mt-4 border-t border-dashed border-neutral-300 pt-1 text-neutral-400">Operator Sign</div>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded">
                    <div className="font-semibold">Flexo Printing Check</div>
                    <div className="text-neutral-500 mt-1">Ink shade & Registration</div>
                    <div className="mt-4 border-t border-dashed border-neutral-300 pt-1 text-neutral-400">Printer Sign</div>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded">
                    <div className="font-semibold">Bursting Strength Lab</div>
                    <div className="text-neutral-500 mt-1">BS Test: _____ kg/cm²</div>
                    <div className="mt-4 border-t border-dashed border-neutral-300 pt-1 text-neutral-400">QC Inspector</div>
                  </div>
                  <div className="border border-neutral-300 p-2 rounded">
                    <div className="font-semibold">Final Dispatch Dock</div>
                    <div className="text-neutral-500 mt-1">Bundle Count Verified</div>
                    <div className="mt-4 border-t border-dashed border-neutral-300 pt-1 text-neutral-400">Dispatch Officer</div>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="border-t border-neutral-300 pt-3 text-[10px] text-neutral-500 flex justify-between items-center">
                <span>Powered by CorruTrack Digital Manufacturing Operations</span>
                <span>Generated for print/PDF on {new Date().toLocaleString()}</span>
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* Thermal Printer Slip & Pallet Label Layout (4" x 6") */
            /* ==================================================== */
            <div className="p-6 max-w-md mx-auto space-y-4 text-neutral-900 border-2 border-neutral-900 m-4 rounded printable-thermal-slip">
              {/* Thermal Label Header */}
              <div className="border-b-2 border-neutral-900 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                    {settings.companyName}
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tight text-neutral-950 mt-0.5">
                    {order.id}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-neutral-600">Priority</div>
                  <div className="text-sm font-bold font-mono text-neutral-950">{order.priority.toUpperCase()}</div>
                </div>
              </div>

              {/* Customer & Destination */}
              <div className="border-b-2 border-neutral-900 pb-3 space-y-1">
                <div className="text-[10px] font-bold uppercase text-neutral-600">Consignee:</div>
                <div className="text-lg font-black leading-tight text-neutral-950">
                  {order.customerCompany}
                </div>
                <div className="text-xs font-semibold text-neutral-800">
                  Attn: {order.customerName} ({order.customerPhone})
                </div>
                <div className="text-xs text-neutral-700 font-mono mt-0.5 leading-snug">
                  {order.deliveryAddress}
                </div>
              </div>

              {/* Key Box Dimensions & Bundle Count */}
              <div className="grid grid-cols-2 gap-2 border-b-2 border-neutral-900 pb-3">
                <div className="p-2 bg-neutral-100 border border-neutral-300 rounded">
                  <div className="text-[10px] font-bold uppercase text-neutral-600">Box Dimensions</div>
                  <div className="text-sm font-black font-mono text-neutral-950 mt-0.5">
                    {order.dimensions.lengthMm} x {order.dimensions.widthMm} x {order.dimensions.heightMm}
                  </div>
                  <div className="text-[10px] text-neutral-600">in millimeters (L x W x H)</div>
                </div>

                <div className="p-2 bg-neutral-100 border border-neutral-300 rounded text-right">
                  <div className="text-[10px] font-bold uppercase text-neutral-600">Order Quantity</div>
                  <div className="text-lg font-black font-mono text-neutral-950">
                    {order.quantity.toLocaleString()} PCS
                  </div>
                  <div className="text-[10px] font-bold text-neutral-700">
                    {order.bundlesCount} BUNDLES
                  </div>
                </div>
              </div>

              {/* Flute & Board Spec */}
              <div className="text-xs space-y-1 border-b-2 border-neutral-900 pb-3">
                <div className="flex justify-between">
                  <span className="font-bold">Board Specification:</span>
                  <span className="font-mono font-bold">{order.ply} · {order.flute}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Box Style & Joint:</span>
                  <span>{order.boxStyle.split(' ')[0]} ({order.jointType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Commitment SLA:</span>
                  <span className="font-mono font-bold text-neutral-950">{formatDateTime(order.expectedDeliveryDate)}</span>
                </div>
              </div>

              {/* Large Centered QR Code for Fast Dock Scanning */}
              <div className="pt-2 flex flex-col items-center justify-center text-center">
                <OrderQRCode
                  orderId={order.id}
                  size={120}
                  lightMode={true}
                  showActions={true}
                  label="Scan to Verify Shipment & POD"
                />
                <div className="text-[10px] text-neutral-600 font-mono mt-1">
                  CorruTrack Live Traceability Barcode
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

