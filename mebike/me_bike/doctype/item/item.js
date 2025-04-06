async function set_sku_suggestions(frm) {
  frappe.db.get_list("Item Color", {
    fields: ['name'],
  }).then((records) => {
    if (records.length > 0) {

      const options = records.map((item_color) => ({ value: item_color.name, label: item_color.name }));

      frm.fields_dict.item_color.set_data(options);
    } else {

      frm.set_df_property("item_color", "options", []);
    }
  });
}

frappe.ui.form.on("Item", {
  refresh: function (frm) {
    set_sku_suggestions(frm); 
  },
});
