import { db } from './index.ts';
import { orders, orderTimelineEvents } from './schema.ts';
import { eq, desc, asc } from 'drizzle-orm';
import type { CorrugatedOrder } from '../types/order.ts';

export async function getDbOrders(): Promise<CorrugatedOrder[]> {
  try {
    const rawOrders = await db.select().from(orders).orderBy(asc(orders.queuePriority), desc(orders.createdAt));
    return rawOrders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      customerCompany: o.customerCompany || o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail || undefined,
      deliveryAddress: o.deliveryAddress || 'Factory Gate Dispatch',
      boxStyle: o.boxStyle as any,
      dimensions: {
        lengthMm: o.lengthMm,
        widthMm: o.widthMm,
        heightMm: o.heightMm,
      },
      ply: o.ply as any,
      flute: o.flute as any,
      paperSpecs: {
        topLinerGsm: parseInt(o.paperSpecsTop || '230', 10) || 230,
        flutingMediumGsm: parseInt(o.paperSpecsFlute || '140', 10) || 140,
        bottomLinerGsm: parseInt(o.paperSpecsBottom || '180', 10) || 180,
        burstingFactor: 20,
      },
      lamination: (o.lamination as any) || 'None',
      colorType: (o.colorType as any) || 'Plain / Unprinted',
      printingDetails: o.printingDetails || 'Standard Plant Specifications',
      jointType: (o.jointType as any) || 'Glued',
      quantity: o.quantity,
      ratePerBox: o.ratePerBox || Math.round(o.totalAmount / (o.quantity || 1)),
      totalAmount: o.totalAmount,
      currentStage: o.currentStage as any,
      stageHistory: [],
      priority: o.priority as any,
      queuePriority: o.queuePriority || 1,
      equipmentStatus: o.equipmentStatus || undefined,
      assignedLine: o.assignedLine || undefined,
      operatorInCharge: o.operatorInCharge || undefined,
      orderDate: o.orderDate,
      expectedDeliveryDate: o.expectedDeliveryDate,
    }));
  } catch (error) {
    console.error('Database getDbOrders query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertDbOrder(order: CorrugatedOrder) {
  try {
    const values = {
      id: order.id,
      customerName: order.customerName,
      customerCompany: order.customerCompany || order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || null,
      deliveryAddress: order.deliveryAddress || 'Plant Dispatch Dock',
      boxStyle: order.boxStyle,
      lengthMm: order.dimensions.lengthMm,
      widthMm: order.dimensions.widthMm,
      heightMm: order.dimensions.heightMm,
      ply: String(order.ply),
      flute: String(order.flute),
      paperSpecsTop: String(order.paperSpecs?.topLinerGsm || 230),
      paperSpecsFlute: String(order.paperSpecs?.flutingMediumGsm || 140),
      paperSpecsBottom: String(order.paperSpecs?.bottomLinerGsm || 180),
      lamination: order.lamination || 'None',
      colorType: order.colorType || 'Plain / Unprinted',
      printingDetails: order.printingDetails || 'Standard Flexo',
      jointType: order.jointType || 'Glued',
      quantity: order.quantity,
      ratePerBox: order.ratePerBox || 0,
      totalAmount: order.totalAmount,
      currentStage: order.currentStage,
      priority: order.priority,
      queuePriority: order.queuePriority || 1,
      equipmentStatus: order.equipmentStatus || 'Ready for Setup',
      assignedLine: order.assignedLine || null,
      operatorInCharge: order.operatorInCharge || null,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      updatedAt: new Date(),
    };

    const res = await db
      .insert(orders)
      .values(values)
      .onConflictDoUpdate({
        target: orders.id,
        set: values,
      })
      .returning();

    return res[0];
  } catch (error) {
    console.error(`Database upsertDbOrder failed for ${order.id}:`, error);
    throw new Error('Failed to save order to relational database.', { cause: error });
  }
}

export async function upsertBulkDbOrders(orderList: CorrugatedOrder[]) {
  const results = [];
  for (const o of orderList) {
    results.push(await upsertDbOrder(o));
  }
  return results;
}
