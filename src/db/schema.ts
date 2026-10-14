import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table with Firebase UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Corrugated Box Manufacturing Orders Table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // Job ID: e.g. "CB-8941"
  customerName: text('customer_name').notNull(),
  customerCompany: text('customer_company').notNull().default(''),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  deliveryAddress: text('delivery_address').notNull().default(''),
  boxStyle: text('box_style').notNull(),
  lengthMm: integer('length_mm').notNull(),
  widthMm: integer('width_mm').notNull(),
  heightMm: integer('height_mm').notNull(),
  ply: text('ply').notNull(), // '3-Ply' | '5-Ply' | '7-Ply'
  flute: text('flute').notNull(), // 'B' | 'C' | 'E' | 'Broad' | 'Narrow'
  paperSpecsTop: text('paper_specs_top').default(''),
  paperSpecsFlute: text('paper_specs_flute').default(''),
  paperSpecsBottom: text('paper_specs_bottom').default(''),
  lamination: text('lamination').default('None'),
  colorType: text('color_type').default('Plain / Unprinted'),
  printingDetails: text('printing_details').default(''),
  jointType: text('joint_type').notNull().default('Glued'),
  quantity: integer('quantity').notNull(),
  ratePerBox: integer('rate_per_box').default(0),
  totalAmount: integer('total_amount').notNull(),
  currentStage: text('current_stage').notNull(),
  priority: text('priority').notNull(),
  queuePriority: integer('queue_priority').default(1),
  equipmentStatus: text('equipment_status').default('Ready for Setup'),
  assignedLine: text('assigned_line'),
  operatorInCharge: text('operator_in_charge'),
  orderDate: text('order_date').notNull(),
  expectedDeliveryDate: text('expected_delivery_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Order Stage Transition History
export const orderTimelineEvents = pgTable('order_timeline_events', {
  id: serial('id').primaryKey(),
  orderId: text('order_id')
    .references(() => orders.id)
    .notNull(),
  stage: text('stage').notNull(),
  timestamp: text('timestamp').notNull(),
  updatedBy: text('updated_by'),
  notes: text('notes'),
  durationMinutes: integer('duration_minutes').default(0),
});

// Drizzle Relations
export const ordersRelations = relations(orders, ({ many }) => ({
  timelineEvents: many(orderTimelineEvents),
}));

export const orderTimelineEventsRelations = relations(orderTimelineEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderTimelineEvents.orderId],
    references: [orders.id],
  }),
}));
