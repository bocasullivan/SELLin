export type BusinessSettings = {
  name: string;
  email: string;
  address: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  phone: string;
  invoiceAuthor: string;
  signature: string;
  logo: string;
};

export const initialBusiness: BusinessSettings = {
  name: "Bisnis kamu",
  email: "",
  address: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  phone: "",
  invoiceAuthor: "",
  signature: "",
  logo: "",
};
