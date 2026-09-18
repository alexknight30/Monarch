export const PROFILE_FIELDS = ["fullName","preferredName","email","studentId","major","year","school"] as const;
export type StudentProfile = Record<(typeof PROFILE_FIELDS)[number],string>;
export function emptyProfile(): StudentProfile { return {fullName:"",preferredName:"",email:"",studentId:"",major:"",year:"",school:""}; }
