const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed,
  ip: String,
  at: { type: Date, default: Date.now },
  note: String,
});

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
