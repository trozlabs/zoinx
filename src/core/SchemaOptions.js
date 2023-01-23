module.exports = class SchemaOptionsDefault {
    static timestamps = { createdAt: 'created_at', updatedAt: 'updated_at' };
    static toJSON = {
        virtuals: true,
        versionKey: false,
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    };
};
