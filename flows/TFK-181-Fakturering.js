const description = 'Fakturering'
const { xledger } = require('../config')

// Just an index of what value should in what columns in the SO01b_2 file
const columns = {
	 ownerId: 0,
	 impSystem: 1,
	 lineNo: 5,
	 readyToInvoice: 9,
	 productCode: 18,
	 description: 21,
	 quantity: 26,
	 unitPrice: 28,
	 customerName: 37,
	 customerNo: 38,
	 address: 43,
	 zip: 45,
	 city: 46,
	 ref:60,
	 serviceType:69,
	 soGroup:79,
	 endOfFile: 82
	}

const sendFile = async (filename, blob) => {
	const url = `${xledger.baseUrl}/import/SO01b_2/files`
	const response =  await fetch(url, {
		method: 'POST',
		headers: {
			'filename': filename,
			'contentType': 'text/csv'
		},
		body: blob
	})

	return response
}

const addHeader = (csvArray) => {
	csvArray.push('Owner ID/Entity Code;ImpSystem;ImpSystemRef;Invoice Batch;Order No;Line No;Date;Customer No (Imp);Invoice Rule;Ready To Invoice;Work Order;Project;Object;Object Value;Posting 1;Posting 2;XGL;Currency;Product;Product Item;XLG;Tekst (imp);Pricelist;Price Group;Invoice Rule;Unit;Quantity;Cost Price;Unit Price;Discount % Imp;Discount Imp;TaxRule;Pre Paid To Bank;Pre Paid Date;Payment Ref;XIdentifier (KID);External Order Ref;Customer;Company No;Customer Group (Imp);BankAccount;Payment Terms;Address Flag;Street Address Line 1;Street Address Line 2;Zip Code;City;State;Country;Street Address 2 Line 1;Street Address 2 Line 2;Zip Code;City 2;State 2;Country 2;Phone;Email;Language;Invoice Delivery Method;Invoice Layout;Your Ref;Ordered By;Our Sales Tmp;Our Ref Tmp;Contract;Extern GL;Period Start Tmp;Period Start Offset;No of Periods;Service Type;Tax Amount (Vat);Warehouse;Location;Header Info;Footer Info;Header Text Tmp;Footer Text Tmp;SL Type;SL Key;SO Group;Dummy4;Dummy5;End Of Line')
}

const addLine = (ownerId, productCode, description, quantity, unitPrice, customerName, customerNo, address, zip, city, ref, serviceType, csvArray) => {

	// For å gjøre til litt mindre arcane og slippe å bare ha en lang string med x antall ';' i, så bygger vi den opp på denne måten	
	const SO01b_2 = []

	// Create 83 columns for format
	for(let i=0; i< 83; i++){
		SO01b_2.push('')
	}
	SO01b_2[columns.ownerId] = ownerId
	SO01b_2[columns.impSystem] = 'Acos' 
	SO01b_2[columns.lineNo] = 1
	SO01b_2[columns.readyToInvoice] = 1
	SO01b_2[columns.productCode] 		= productCode
	SO01b_2[columns.description] = description  	
	SO01b_2[columns.quantity] = quantity
	SO01b_2[columns.unitPrice] = unitPrice
	SO01b_2[columns.customerName] = customerName
	SO01b_2[columns.customerNo] = customerNo
	SO01b_2[columns.address] = address
	SO01b_2[columns.zip] = zip
	SO01b_2[columns.city] = city
	SO01b_2[columns.ref] = ref
	SO01b_2[columns.serviceType] = serviceType
	SO01b_2[columns.soGroup] = serviceType
	SO01b_2[columns.endOfFile] = 'X'
	csvArray.push(SO01b_2.join(';'))	
}

module.exports = {
	config: {
		enabled: true,
		doNotRemoveBlobs: false
	},
	parseJson: {
		enabled: true,
		options: {
			mapper: (dialogueData) => {
				return {
				}
			}
		}
	},

	// CustomJob post to mongoDB
	customJobSendInvoice: {
		enabled: true,
		runAfter: 'parseJson',
		options: {},
		customJob: async (jobDef, flowStatus) => {
			const invoiceValues = flowStatus.parseJson.result.DialogueInstance.Faktura

			// Vi må sjekke at de 3 første tallene i produktet matcher ansvarskoden. Disse 3 er salgsordergruppe og serviceType 
			const serviceType = flowStatus.parseJson.result.DialogueInstance.Faktura.Ansvar.toString().substring(0, 3)

			const csvFile = []
			addHeader(csvFile)

			invoiceValues.Produkt.forEach(function (product) {
				// sjekk for at produktkoden starter med ansvarskoden
				if (serviceType !== product.Produktkode.toString().substring(0, 3)) {
					return
				}

				addLine(
					'39006',
					product.Produktkode,
					product.Beskrivelse,
					product.Antall,
					product.Enhetspris,
					invoiceValues.Kunde.Navn,
					invoiceValues.Kunde.Kundetype === 'Privatkunde' ? invoiceValues.Kunde.PersonNr : invoiceValues.Kunde.OrgNr,
					invoiceValues.Kunde.Adresse,
					invoiceValues.Kunde.PostNr,
					invoiceValues.Kunde.Poststed,
					'',
					serviceType,
					csvFile
				)
			})

			var enc = new TextEncoder();
			const buffer = enc.encode(csvFile.join('\n'))
			const filename = xledger.invoiceFilename
			const res = await sendFile(filename, buffer)
			const status = await res.status

			if(status !== 200) {
				throw new Error('Feil i filopplasting mot x-ledger') 
			}
			return status
		}
	},
	statistics: {
		enabled: false,
		options: {
			mapper: (flowStatus) => {
				// Mapping av verdier fra JSON-avleveringsfil fra dialogueportal
				return {
					company: '',
					description,
					type: 'Faktura' // Required. A short searchable type-name that distinguishes the statistic element
				}
			}
		}
	},
	failOnPurpose: {
		enabled: false
	}
}
