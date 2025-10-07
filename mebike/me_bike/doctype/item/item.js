frappe.ui.form.on("Item", {
  refresh: async function (frm) {
    const records = await frappe.db.get_list("Item Color", {
      fields: ['name'],
      filters: { color_status: 'Active' }
    });

    frm.fields_dict.item_color.set_data(records.length ? records.map(item_color => ({ value: item_color.name, label: item_color.name })) : []);

    const readOnlyFields = ['tbi_price_with_gst', 'model', 'customer_discount_per', 'item_color', 'item_category', 'item_sub_category', 'hsn_code', 'item_mrp', 'tbi_gst_slab',
       'item_weight', 'partner_discount'];
    
    if (!frm.is_new() || !frm.is_dirty()) {
      frm.disable_save();
    }

    if (!frm.is_new()) {
      readOnlyFields.forEach(field => {
        frm.set_df_property(field, 'read_only', 1);
      });
    }

    if (frappe.user.has_role('Accounts Manager') && !frm.is_new() && frm.doc.status === 'In Stock') {
      frm.add_custom_button(__('Mark Out of Stock'), async () => {
        frm.set_value('item_current_stock', 0);
        await frm.save();
        frappe.msgprint(__('Item marked as Out of Stock.'));
      })
      $("button[data-label='Mark%20Out%20of%20Stock']").removeClass("btn-default").addClass("manns_red_button");
    }
    if (frappe.user.has_role('Accounts Manager') && !frm.is_new() && frm.doc.status === 'Out of Stock') {
      frm.add_custom_button(__('Mark In Stock'), async () => {
        frm.set_value('item_current_stock', 1);
        await frm.save();
        frappe.msgprint(__('Item marked as In Stock.'));
      })
      $("button[data-label='Mark%20In%20Stock']").removeClass("btn-default").addClass("manns_green_button");
    }

    if (frappe.user.has_role('Accounts Manager') && !frm.is_new()) {

      frm.add_custom_button(__('Set Order Limit'), () => {
        const dialog = new frappe.ui.Dialog({
          title: __('Set Order Limit'),
          fields: [
            { fieldtype: 'Int', fieldname: 'minimum_quantity', label: __('Minimum Order Quantity'), reqd: 1 },
            { fieldtype: 'Int', fieldname: 'maximum_quantity', label: __('Maximum Order Quantity'), reqd: 1 }
          ],
          primary_action: function () {
            const data = dialog.get_values();
            if (data) {
              frappe.confirm(
                __('Are you sure to Set Order Limit?'),
                async () => {

                  frm.set_value('minimum_quantity', data.minimum_quantity);
                  frm.set_value('maximum_quantity', data.maximum_quantity);
                  dialog.hide();
                  await frm.save();
                  frappe.msgprint(__('Order Limit has been set.'));
                },
                () => {
                  dialog.hide();
                }
              );
            }
          },
          primary_action_label: __('Set Limit')
        });
        dialog.show();
      })
      $("button[data-label='Set%20Order%20Limit']").removeClass("btn-default").addClass("manns_blue_button");
    }

    if (frappe.user.has_role('Accounts Manager') && !frm.is_new()) {
      frm.add_custom_button(__('Edit Details'), () => {
        readOnlyFields.forEach(field => {
          frm.set_df_property(field, 'read_only', 0);
        });
        frm.enable_save();
        frm.remove_custom_button('Set Order Limit');
        frm.remove_custom_button('Mark Out of Stock');
      })
      $("button[data-label='Edit%20Details']").removeClass("btn-default").addClass("manns_blue_button");
    }

    

    

  }
});
