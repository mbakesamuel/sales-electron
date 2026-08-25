export interface ConsignmentDetailsRecord {
    id: string;
    saleId: string;
    consignerName: string;
    consignerDesignation: string;
    dateOfConsignment: string;
    receiverName: string;
    receiverNicNo: string | null;
    receiverNicPlaceOfIssue: string | null;
    receivedDate: string | null;
}
