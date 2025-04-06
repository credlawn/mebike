frappe.ui.form.on('Partner Books', {
    refresh: function(frm) {
        if (frm.doc.transaction_history) {
            frm.doc.transaction_history.sort(function(a, b) {
                return new Date(b.transaction_date) - new Date(a.transaction_date);
            });

            frm.doc.transaction_history.forEach(function(item, index) {
                item.idx = index + 1;
            });

            frm.refresh_field('transaction_history');
        }

        var rows = document.getElementsByClassName("grid-row");
        for (var i = 0; i < rows.length; i++) {
            var fieldElement = rows[i].querySelector(".grid-static-col[data-fieldname='transaction_type']");
            if (fieldElement) {
                let transactionType = fieldElement.innerText.trim();
                if (transactionType === "Debit") {
                    fieldElement.style.color = "red";
                    fieldElement.style.fontWeight = "bold";
                } else if (transactionType === "Credit") {
                    fieldElement.style.color = "green";
                    fieldElement.style.fontWeight = "bold";
                }
            }
        }
    }
});
