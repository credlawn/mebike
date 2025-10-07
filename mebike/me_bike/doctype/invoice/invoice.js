frappe.ui.form.on('Invoice', {
    refresh: function(frm) {
        $('.data-row.filter-row').remove();
        frm.page.wrapper.find('.data-row.filter-row').remove();

        const grid = frm.fields_dict.items.grid;
        grid.wrapper.find('.grid-row').css('pointer-events', 'none');
        grid.wrapper.find('.btn-open-row').hide();
        const disableGear = () => grid.wrapper.find('use[href="#icon-setting-gear"]').closest('a').hide().off('click');
        setTimeout(disableGear, 0);

        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('View Invoice'), function() {
                const doc_name = frm.doc.name;
                const url = `https://billing.mebikeindia.com/api/method/frappe.utils.print_format.download_pdf?doctype=Invoice&name=${encodeURIComponent(doc_name)}&format=Invoice&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
                window.open(url, '_blank');
            });

            frm.add_custom_button(__('Download Invoice'), function () {
                const download_url = `/api/method/frappe.utils.print_format.download_pdf?doctype=Invoice&name=${encodeURIComponent(frm.doc.name)}&format=Invoice&no_letterhead=0&letterhead=mebike&settings=%7B%7D&_lang=en`;
                const link = document.createElement('a');
                link.href = download_url;
                link.download = `${frm.doc.name}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                frappe.msgprint({
                    title: __('Success'),
                    message: `<div style="background-color:#ffffff;padding:24px;border-radius:8px;border-left:4px solid #ED3833;font-family:'Arial',sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.12);width:100%;box-sizing:border-box;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 9H15V3H9V9H5L12 16L19 9Z" fill="#ED3833"/>
            <path d="M5 20H19V18H5V20Z" fill="#ED3833"/>
        </svg>
        <span style="font-size:19px;font-weight:600;color:#212529;">Invoice Ready</span>
    </div>
    <p style="margin:0;font-size:16px;color:#495057;line-height:1.5;font-weight:500;">Your download will start automatically.</p>
</div>`,
                    indicator: 'green'
                });
            });

            setTimeout(() => {
                $("button[data-label='View%20Invoice']").removeClass("btn-default").addClass("manns_blue_button");
                $("button[data-label='Download%20Invoice']").removeClass("btn-default").addClass("manns_green_button");
            }, 0);
        }
    }
});
