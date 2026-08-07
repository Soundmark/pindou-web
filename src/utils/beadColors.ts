export interface BeadColor {
  id: string;
  name: string;
  hex: string;
  r: number;
  g: number;
  b: number;
}

// MARD palette (291 colors)
export const BEAD_PALETTE: BeadColor[] = [
  { id: 'A01', name: 'A01', hex: '#FAF4C8', r: 250, g: 244, b: 200 },
  { id: 'A02', name: 'A02', hex: '#FFFFD5', r: 255, g: 255, b: 213 },
  { id: 'A03', name: 'A03', hex: '#FEFF8B', r: 254, g: 255, b: 139 },
  { id: 'A04', name: 'A04', hex: '#FBED56', r: 251, g: 237, b: 86 },
  { id: 'A05', name: 'A05', hex: '#F4D738', r: 244, g: 215, b: 56 },
  { id: 'A06', name: 'A06', hex: '#FEAC4C', r: 254, g: 172, b: 76 },
  { id: 'A07', name: 'A07', hex: '#FE8B4C', r: 254, g: 139, b: 76 },
  { id: 'A08', name: 'A08', hex: '#FFDA45', r: 255, g: 218, b: 69 },
  { id: 'A09', name: 'A09', hex: '#FF995B', r: 255, g: 153, b: 91 },
  { id: 'A10', name: 'A10', hex: '#F77C31', r: 247, g: 124, b: 49 },
  { id: 'A11', name: 'A11', hex: '#FFDD99', r: 255, g: 221, b: 153 },
  { id: 'A12', name: 'A12', hex: '#FE9F72', r: 254, g: 159, b: 114 },
  { id: 'A13', name: 'A13', hex: '#FFC365', r: 255, g: 195, b: 101 },
  { id: 'A14', name: 'A14', hex: '#FD543D', r: 253, g: 84, b: 61 },
  { id: 'A15', name: 'A15', hex: '#FFF365', r: 255, g: 243, b: 101 },
  { id: 'A16', name: 'A16', hex: '#FFFF9F', r: 255, g: 255, b: 159 },
  { id: 'A17', name: 'A17', hex: '#FFE36E', r: 255, g: 227, b: 110 },
  { id: 'A18', name: 'A18', hex: '#FEBE7D', r: 254, g: 190, b: 125 },
  { id: 'A19', name: 'A19', hex: '#FD7C72', r: 253, g: 124, b: 114 },
  { id: 'A20', name: 'A20', hex: '#FFD568', r: 255, g: 213, b: 104 },
  { id: 'A21', name: 'A21', hex: '#FFE395', r: 255, g: 227, b: 149 },
  { id: 'A22', name: 'A22', hex: '#F4F57D', r: 244, g: 245, b: 125 },
  { id: 'A23', name: 'A23', hex: '#E6C9B7', r: 230, g: 201, b: 183 },
  { id: 'A24', name: 'A24', hex: '#F7F8A2', r: 247, g: 248, b: 162 },
  { id: 'A25', name: 'A25', hex: '#FFD67D', r: 255, g: 214, b: 125 },
  { id: 'A26', name: 'A26', hex: '#FFC830', r: 255, g: 200, b: 48 },
  { id: 'B01', name: 'B01', hex: '#E6EE31', r: 230, g: 238, b: 49 },
  { id: 'B02', name: 'B02', hex: '#63F347', r: 99, g: 243, b: 71 },
  { id: 'B03', name: 'B03', hex: '#9EF780', r: 158, g: 247, b: 128 },
  { id: 'B04', name: 'B04', hex: '#5DE035', r: 93, g: 224, b: 53 },
  { id: 'B05', name: 'B05', hex: '#35E352', r: 53, g: 227, b: 82 },
  { id: 'B06', name: 'B06', hex: '#65E2A6', r: 101, g: 226, b: 166 },
  { id: 'B07', name: 'B07', hex: '#3DAF80', r: 61, g: 175, b: 128 },
  { id: 'B08', name: 'B08', hex: '#1C9C4F', r: 28, g: 156, b: 79 },
  { id: 'B09', name: 'B09', hex: '#27523A', r: 39, g: 82, b: 58 },
  { id: 'B10', name: 'B10', hex: '#95D3C2', r: 149, g: 211, b: 194 },
  { id: 'B11', name: 'B11', hex: '#5D722A', r: 93, g: 114, b: 42 },
  { id: 'B12', name: 'B12', hex: '#166F41', r: 22, g: 111, b: 65 },
  { id: 'B13', name: 'B13', hex: '#CAEB7B', r: 202, g: 235, b: 123 },
  { id: 'B14', name: 'B14', hex: '#ADE946', r: 173, g: 233, b: 70 },
  { id: 'B15', name: 'B15', hex: '#2E5132', r: 46, g: 81, b: 50 },
  { id: 'B16', name: 'B16', hex: '#C5ED9C', r: 197, g: 237, b: 156 },
  { id: 'B17', name: 'B17', hex: '#9BB13A', r: 155, g: 177, b: 58 },
  { id: 'B18', name: 'B18', hex: '#E6EE49', r: 230, g: 238, b: 73 },
  { id: 'B19', name: 'B19', hex: '#24B88C', r: 36, g: 184, b: 140 },
  { id: 'B20', name: 'B20', hex: '#C2F0CC', r: 194, g: 240, b: 204 },
  { id: 'B21', name: 'B21', hex: '#156A6B', r: 21, g: 106, b: 107 },
  { id: 'B22', name: 'B22', hex: '#0B3C43', r: 11, g: 60, b: 67 },
  { id: 'B23', name: 'B23', hex: '#303A21', r: 48, g: 58, b: 33 },
  { id: 'B24', name: 'B24', hex: '#EEFCA5', r: 238, g: 252, b: 165 },
  { id: 'B25', name: 'B25', hex: '#4E846D', r: 78, g: 132, b: 109 },
  { id: 'B26', name: 'B26', hex: '#8D7A35', r: 141, g: 122, b: 53 },
  { id: 'B27', name: 'B27', hex: '#CCE1AF', r: 204, g: 225, b: 175 },
  { id: 'B28', name: 'B28', hex: '#9EE5B9', r: 158, g: 229, b: 185 },
  { id: 'B29', name: 'B29', hex: '#C5E254', r: 197, g: 226, b: 84 },
  { id: 'B30', name: 'B30', hex: '#E2FCB1', r: 226, g: 252, b: 177 },
  { id: 'B31', name: 'B31', hex: '#B0E792', r: 176, g: 231, b: 146 },
  { id: 'B32', name: 'B32', hex: '#9CAB5A', r: 156, g: 171, b: 90 },
  { id: 'C01', name: 'C01', hex: '#E8FFE7', r: 232, g: 255, b: 231 },
  { id: 'C02', name: 'C02', hex: '#A9F9FC', r: 169, g: 249, b: 252 },
  { id: 'C03', name: 'C03', hex: '#A0E2FB', r: 160, g: 226, b: 251 },
  { id: 'C04', name: 'C04', hex: '#41CCFF', r: 65, g: 204, b: 255 },
  { id: 'C05', name: 'C05', hex: '#01ACEB', r: 1, g: 172, b: 235 },
  { id: 'C06', name: 'C06', hex: '#50AAF0', r: 80, g: 170, b: 240 },
  { id: 'C07', name: 'C07', hex: '#3677D2', r: 54, g: 119, b: 210 },
  { id: 'C08', name: 'C08', hex: '#0F54C0', r: 15, g: 84, b: 192 },
  { id: 'C09', name: 'C09', hex: '#324BCA', r: 50, g: 75, b: 202 },
  { id: 'C10', name: 'C10', hex: '#3EBCE2', r: 62, g: 188, b: 226 },
  { id: 'C11', name: 'C11', hex: '#28DDDE', r: 40, g: 221, b: 222 },
  { id: 'C12', name: 'C12', hex: '#1C334D', r: 28, g: 51, b: 77 },
  { id: 'C13', name: 'C13', hex: '#CDE8FF', r: 205, g: 232, b: 255 },
  { id: 'C14', name: 'C14', hex: '#D5FDFF', r: 213, g: 253, b: 255 },
  { id: 'C15', name: 'C15', hex: '#22C4C6', r: 34, g: 196, b: 198 },
  { id: 'C16', name: 'C16', hex: '#1557A8', r: 21, g: 87, b: 168 },
  { id: 'C17', name: 'C17', hex: '#04D1F6', r: 4, g: 209, b: 246 },
  { id: 'C18', name: 'C18', hex: '#1D3344', r: 29, g: 51, b: 68 },
  { id: 'C19', name: 'C19', hex: '#1887A2', r: 24, g: 135, b: 162 },
  { id: 'C20', name: 'C20', hex: '#176DAF', r: 23, g: 109, b: 175 },
  { id: 'C21', name: 'C21', hex: '#BEDDFF', r: 190, g: 221, b: 255 },
  { id: 'C22', name: 'C22', hex: '#67B4BE', r: 103, g: 180, b: 190 },
  { id: 'C23', name: 'C23', hex: '#C8E2FF', r: 200, g: 226, b: 255 },
  { id: 'C24', name: 'C24', hex: '#7CC4FF', r: 124, g: 196, b: 255 },
  { id: 'C25', name: 'C25', hex: '#A9E5E5', r: 169, g: 229, b: 229 },
  { id: 'C26', name: 'C26', hex: '#3CAED8', r: 60, g: 174, b: 216 },
  { id: 'C27', name: 'C27', hex: '#D3DFFA', r: 211, g: 223, b: 250 },
  { id: 'C28', name: 'C28', hex: '#BBCFED', r: 187, g: 207, b: 237 },
  { id: 'C29', name: 'C29', hex: '#34488E', r: 52, g: 72, b: 142 },
  { id: 'D01', name: 'D01', hex: '#AEB4F2', r: 174, g: 180, b: 242 },
  { id: 'D02', name: 'D02', hex: '#858EDD', r: 133, g: 142, b: 221 },
  { id: 'D03', name: 'D03', hex: '#2F54AF', r: 47, g: 84, b: 175 },
  { id: 'D04', name: 'D04', hex: '#182A84', r: 24, g: 42, b: 132 },
  { id: 'D05', name: 'D05', hex: '#B843C5', r: 184, g: 67, b: 197 },
  { id: 'D06', name: 'D06', hex: '#AC7BDE', r: 172, g: 123, b: 222 },
  { id: 'D07', name: 'D07', hex: '#8854B3', r: 136, g: 84, b: 179 },
  { id: 'D08', name: 'D08', hex: '#E2D3FF', r: 226, g: 211, b: 255 },
  { id: 'D09', name: 'D09', hex: '#D5B9F8', r: 213, g: 185, b: 248 },
  { id: 'D10', name: 'D10', hex: '#361851', r: 54, g: 24, b: 81 },
  { id: 'D11', name: 'D11', hex: '#B9BAE1', r: 185, g: 186, b: 225 },
  { id: 'D12', name: 'D12', hex: '#DE9AD4', r: 222, g: 154, b: 212 },
  { id: 'D13', name: 'D13', hex: '#B90095', r: 185, g: 0, b: 149 },
  { id: 'D14', name: 'D14', hex: '#8B279B', r: 139, g: 39, b: 155 },
  { id: 'D15', name: 'D15', hex: '#2F1F90', r: 47, g: 31, b: 144 },
  { id: 'D16', name: 'D16', hex: '#E3E1EE', r: 227, g: 225, b: 238 },
  { id: 'D17', name: 'D17', hex: '#C4D4F6', r: 196, g: 212, b: 246 },
  { id: 'D18', name: 'D18', hex: '#A45EC7', r: 164, g: 94, b: 199 },
  { id: 'D19', name: 'D19', hex: '#D8C3D7', r: 216, g: 195, b: 215 },
  { id: 'D20', name: 'D20', hex: '#9C32B2', r: 156, g: 50, b: 178 },
  { id: 'D21', name: 'D21', hex: '#9A009B', r: 154, g: 0, b: 155 },
  { id: 'D22', name: 'D22', hex: '#333A95', r: 51, g: 58, b: 149 },
  { id: 'D23', name: 'D23', hex: '#EBDAFC', r: 235, g: 218, b: 252 },
  { id: 'D24', name: 'D24', hex: '#7786E5', r: 119, g: 134, b: 229 },
  { id: 'D25', name: 'D25', hex: '#494FC7', r: 73, g: 79, b: 199 },
  { id: 'D26', name: 'D26', hex: '#DFC2F8', r: 223, g: 194, b: 248 },
  { id: 'E01', name: 'E01', hex: '#FDD3CC', r: 253, g: 211, b: 204 },
  { id: 'E02', name: 'E02', hex: '#FEC0DF', r: 254, g: 192, b: 223 },
  { id: 'E03', name: 'E03', hex: '#FFB7E7', r: 255, g: 183, b: 231 },
  { id: 'E04', name: 'E04', hex: '#E8649E', r: 232, g: 100, b: 158 },
  { id: 'E05', name: 'E05', hex: '#F551A2', r: 245, g: 81, b: 162 },
  { id: 'E06', name: 'E06', hex: '#F13D74', r: 241, g: 61, b: 116 },
  { id: 'E07', name: 'E07', hex: '#C63478', r: 198, g: 52, b: 120 },
  { id: 'E08', name: 'E08', hex: '#FFDBE9', r: 255, g: 219, b: 233 },
  { id: 'E09', name: 'E09', hex: '#E970CC', r: 233, g: 112, b: 204 },
  { id: 'E10', name: 'E10', hex: '#D33793', r: 211, g: 55, b: 147 },
  { id: 'E11', name: 'E11', hex: '#FCDDD2', r: 252, g: 221, b: 210 },
  { id: 'E12', name: 'E12', hex: '#F78FC3', r: 247, g: 143, b: 195 },
  { id: 'E13', name: 'E13', hex: '#B5006D', r: 181, g: 0, b: 109 },
  { id: 'E14', name: 'E14', hex: '#FFD1BA', r: 255, g: 209, b: 186 },
  { id: 'E15', name: 'E15', hex: '#F8C7C9', r: 248, g: 199, b: 201 },
  { id: 'E16', name: 'E16', hex: '#FFF3EB', r: 255, g: 243, b: 235 },
  { id: 'E17', name: 'E17', hex: '#FFE2EA', r: 255, g: 226, b: 234 },
  { id: 'E18', name: 'E18', hex: '#FFC7DB', r: 255, g: 199, b: 219 },
  { id: 'E19', name: 'E19', hex: '#FEBAD5', r: 254, g: 186, b: 213 },
  { id: 'E20', name: 'E20', hex: '#D8C7D1', r: 216, g: 199, b: 209 },
  { id: 'E21', name: 'E21', hex: '#BD9DA1', r: 189, g: 157, b: 161 },
  { id: 'E22', name: 'E22', hex: '#B785A1', r: 183, g: 133, b: 161 },
  { id: 'E23', name: 'E23', hex: '#937A8D', r: 147, g: 122, b: 141 },
  { id: 'E24', name: 'E24', hex: '#E1BCE8', r: 225, g: 188, b: 232 },
  { id: 'F01', name: 'F01', hex: '#FD957B', r: 253, g: 149, b: 123 },
  { id: 'F02', name: 'F02', hex: '#FC3D46', r: 252, g: 61, b: 70 },
  { id: 'F03', name: 'F03', hex: '#F74941', r: 247, g: 73, b: 65 },
  { id: 'F04', name: 'F04', hex: '#FC283C', r: 252, g: 40, b: 60 },
  { id: 'F05', name: 'F05', hex: '#E7002F', r: 231, g: 0, b: 47 },
  { id: 'F06', name: 'F06', hex: '#943630', r: 148, g: 54, b: 48 },
  { id: 'F07', name: 'F07', hex: '#971937', r: 151, g: 25, b: 55 },
  { id: 'F08', name: 'F08', hex: '#BC0028', r: 188, g: 0, b: 40 },
  { id: 'F09', name: 'F09', hex: '#E2677A', r: 226, g: 103, b: 122 },
  { id: 'F10', name: 'F10', hex: '#8A4526', r: 138, g: 69, b: 38 },
  { id: 'F11', name: 'F11', hex: '#5A2121', r: 90, g: 33, b: 33 },
  { id: 'F12', name: 'F12', hex: '#FD4E6A', r: 253, g: 78, b: 106 },
  { id: 'F13', name: 'F13', hex: '#F35744', r: 243, g: 87, b: 68 },
  { id: 'F14', name: 'F14', hex: '#FFA9AD', r: 255, g: 169, b: 173 },
  { id: 'F15', name: 'F15', hex: '#D30022', r: 211, g: 0, b: 34 },
  { id: 'F16', name: 'F16', hex: '#FEC2A6', r: 254, g: 194, b: 166 },
  { id: 'F17', name: 'F17', hex: '#E69C79', r: 230, g: 156, b: 121 },
  { id: 'F18', name: 'F18', hex: '#D37C46', r: 211, g: 124, b: 70 },
  { id: 'F19', name: 'F19', hex: '#C1444A', r: 193, g: 68, b: 74 },
  { id: 'F20', name: 'F20', hex: '#CD9391', r: 205, g: 147, b: 145 },
  { id: 'F21', name: 'F21', hex: '#F7B4C6', r: 247, g: 180, b: 198 },
  { id: 'F22', name: 'F22', hex: '#FDC0D0', r: 253, g: 192, b: 208 },
  { id: 'F23', name: 'F23', hex: '#F67E66', r: 246, g: 126, b: 102 },
  { id: 'F24', name: 'F24', hex: '#E698AA', r: 230, g: 152, b: 170 },
  { id: 'F25', name: 'F25', hex: '#E54B4F', r: 229, g: 75, b: 79 },
  { id: 'G01', name: 'G01', hex: '#FFE2CE', r: 255, g: 226, b: 206 },
  { id: 'G02', name: 'G02', hex: '#FFC4AA', r: 255, g: 196, b: 170 },
  { id: 'G03', name: 'G03', hex: '#F4C3A5', r: 244, g: 195, b: 165 },
  { id: 'G04', name: 'G04', hex: '#E1B383', r: 225, g: 179, b: 131 },
  { id: 'G05', name: 'G05', hex: '#EDB045', r: 237, g: 176, b: 69 },
  { id: 'G06', name: 'G06', hex: '#E99C17', r: 233, g: 156, b: 23 },
  { id: 'G07', name: 'G07', hex: '#9D5B3E', r: 157, g: 91, b: 62 },
  { id: 'G08', name: 'G08', hex: '#753832', r: 117, g: 56, b: 50 },
  { id: 'G09', name: 'G09', hex: '#E6B483', r: 230, g: 180, b: 131 },
  { id: 'G10', name: 'G10', hex: '#D98C39', r: 217, g: 140, b: 57 },
  { id: 'G11', name: 'G11', hex: '#E0C593', r: 224, g: 197, b: 147 },
  { id: 'G12', name: 'G12', hex: '#FFC890', r: 255, g: 200, b: 144 },
  { id: 'G13', name: 'G13', hex: '#B7714A', r: 183, g: 113, b: 74 },
  { id: 'G14', name: 'G14', hex: '#8D614C', r: 141, g: 97, b: 76 },
  { id: 'G15', name: 'G15', hex: '#FCF9E0', r: 252, g: 249, b: 224 },
  { id: 'G16', name: 'G16', hex: '#F2D9BA', r: 242, g: 217, b: 186 },
  { id: 'G17', name: 'G17', hex: '#78524B', r: 120, g: 82, b: 75 },
  { id: 'G18', name: 'G18', hex: '#FFE4CC', r: 255, g: 228, b: 204 },
  { id: 'G19', name: 'G19', hex: '#E07935', r: 224, g: 121, b: 53 },
  { id: 'G20', name: 'G20', hex: '#A94023', r: 169, g: 64, b: 35 },
  { id: 'G21', name: 'G21', hex: '#B88558', r: 184, g: 133, b: 88 },
  { id: 'H01', name: 'H01', hex: '#FDFBFF', r: 253, g: 251, b: 255 },
  { id: 'H02', name: 'H02', hex: '#FEFFFF', r: 254, g: 255, b: 255 },
  { id: 'H03', name: 'H03', hex: '#B6B1BA', r: 182, g: 177, b: 186 },
  { id: 'H04', name: 'H04', hex: '#89858C', r: 137, g: 133, b: 140 },
  { id: 'H05', name: 'H05', hex: '#48464E', r: 72, g: 70, b: 78 },
  { id: 'H06', name: 'H06', hex: '#2F2B2F', r: 47, g: 43, b: 47 },
  { id: 'H07', name: 'H07', hex: '#000000', r: 0, g: 0, b: 0 },
  { id: 'H08', name: 'H08', hex: '#E7D6DB', r: 231, g: 214, b: 219 },
  { id: 'H09', name: 'H09', hex: '#EDEDED', r: 237, g: 237, b: 237 },
  { id: 'H10', name: 'H10', hex: '#EEE9EA', r: 238, g: 233, b: 234 },
  { id: 'H11', name: 'H11', hex: '#CECDD5', r: 206, g: 205, b: 213 },
  { id: 'H12', name: 'H12', hex: '#FFF5ED', r: 255, g: 245, b: 237 },
  { id: 'H13', name: 'H13', hex: '#F5ECD2', r: 245, g: 236, b: 210 },
  { id: 'H14', name: 'H14', hex: '#CFD7D3', r: 207, g: 215, b: 211 },
  { id: 'H15', name: 'H15', hex: '#98A6A8', r: 152, g: 166, b: 168 },
  { id: 'H16', name: 'H16', hex: '#1D1414', r: 29, g: 20, b: 20 },
  { id: 'H17', name: 'H17', hex: '#F1EDED', r: 241, g: 237, b: 237 },
  { id: 'H18', name: 'H18', hex: '#FFFDF0', r: 255, g: 253, b: 240 },
  { id: 'H19', name: 'H19', hex: '#F6EFE2', r: 246, g: 239, b: 226 },
  { id: 'H20', name: 'H20', hex: '#949FA3', r: 148, g: 159, b: 163 },
  { id: 'H21', name: 'H21', hex: '#FFFBE1', r: 255, g: 251, b: 225 },
  { id: 'H22', name: 'H22', hex: '#CACAD4', r: 202, g: 202, b: 212 },
  { id: 'H23', name: 'H23', hex: '#9A9D94', r: 154, g: 157, b: 148 },
  { id: 'M01', name: 'M01', hex: '#BCC6B8', r: 188, g: 198, b: 184 },
  { id: 'M02', name: 'M02', hex: '#8AA386', r: 138, g: 163, b: 134 },
  { id: 'M03', name: 'M03', hex: '#697D80', r: 105, g: 125, b: 128 },
  { id: 'M04', name: 'M04', hex: '#E3D2BC', r: 227, g: 210, b: 188 },
  { id: 'M05', name: 'M05', hex: '#D0CCAA', r: 208, g: 204, b: 170 },
  { id: 'M06', name: 'M06', hex: '#B0A782', r: 176, g: 167, b: 130 },
  { id: 'M07', name: 'M07', hex: '#B4A497', r: 180, g: 164, b: 151 },
  { id: 'M08', name: 'M08', hex: '#B38281', r: 179, g: 130, b: 129 },
  { id: 'M09', name: 'M09', hex: '#A58767', r: 165, g: 135, b: 103 },
  { id: 'M10', name: 'M10', hex: '#C5B2BC', r: 197, g: 178, b: 188 },
  { id: 'M11', name: 'M11', hex: '#9F7594', r: 159, g: 117, b: 148 },
  { id: 'M12', name: 'M12', hex: '#644749', r: 100, g: 71, b: 73 },
  { id: 'M13', name: 'M13', hex: '#D19066', r: 209, g: 144, b: 102 },
  { id: 'M14', name: 'M14', hex: '#C77362', r: 199, g: 115, b: 98 },
  { id: 'M15', name: 'M15', hex: '#757D78', r: 117, g: 125, b: 120 },
];

export const HIDDEN_COLOR_REPLACEMENTS: Record<string, string> = {
  'P01': 'H01', 'P02': 'M07', 'P03': 'B31', 'P04': 'F14', 'P05': 'A07',
  'P06': 'B06', 'P07': 'F17', 'P08': 'A20', 'P09': 'H14', 'P10': 'D26',
  'P11': 'H13', 'P12': 'H09', 'P13': 'C28', 'P14': 'B25', 'P15': 'M03',
  'P16': 'A26', 'P17': 'G06', 'P18': 'F16', 'P19': 'H18', 'P20': 'F22',
  'P21': 'A23', 'P22': 'G04', 'P23': 'G07', 'Q01': 'D12', 'Q02': 'A22',
  'Q03': 'B01', 'Q04': 'E16', 'Q05': 'C24', 'R01': 'F15', 'R02': 'E06',
  'R03': 'A10', 'R04': 'B01', 'R05': 'B05', 'R06': 'C19', 'R07': 'C20',
  'R08': 'C08', 'R09': 'D07', 'R10': 'A08', 'R11': 'E16', 'R12': 'H14',
  'R13': 'H05', 'R14': 'C25', 'R15': 'C24', 'R16': 'C10', 'R17': 'B25',
  'R18': 'B10', 'R19': 'B29', 'R20': 'A23', 'R21': 'G13', 'R22': 'G08',
  'R23': 'A18', 'R24': 'E15', 'R25': 'M14', 'R26': 'D12', 'R27': 'E12',
  'R28': 'D06', 'T01': 'H02', 'Y01': 'E09', 'Y02': 'A18', 'Y03': 'B30',
  'Y04': 'C03', 'Y05': 'E12', 'ZG1': 'M10', 'ZG2': 'G04', 'ZG3': 'M01',
  'ZG4': 'H04', 'ZG5': 'H04', 'ZG6': 'C24', 'ZG7': 'D12', 'ZG8': 'E22',
};

// ============================================================================
// Color matching algorithms
// ============================================================================

interface LabColor {
  L: number;
  a: number;
  b: number;
}

const RGB_TO_XYZ_MATRIX = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];

const XYZ_REFERENCE_WHITE = { X: 95.047, Y: 100.000, Z: 108.883 };

function sRGBToLinearRGB(value: number): number {
  value = value / 255;
  if (value <= 0.04045) return value / 12.92;
  return Math.pow((value + 0.055) / 1.055, 2.4);
}

function rgbToXYZ(r: number, g: number, b: number): { X: number; Y: number; Z: number } {
  const rLinear = sRGBToLinearRGB(r);
  const gLinear = sRGBToLinearRGB(g);
  const bLinear = sRGBToLinearRGB(b);
  const X = RGB_TO_XYZ_MATRIX[0][0] * rLinear + RGB_TO_XYZ_MATRIX[0][1] * gLinear + RGB_TO_XYZ_MATRIX[0][2] * bLinear;
  const Y = RGB_TO_XYZ_MATRIX[1][0] * rLinear + RGB_TO_XYZ_MATRIX[1][1] * gLinear + RGB_TO_XYZ_MATRIX[1][2] * bLinear;
  const Z = RGB_TO_XYZ_MATRIX[2][0] * rLinear + RGB_TO_XYZ_MATRIX[2][1] * gLinear + RGB_TO_XYZ_MATRIX[2][2] * bLinear;
  return { X: X * 100, Y: Y * 100, Z: Z * 100 };
}

function xyzToLab(X: number, Y: number, Z: number): LabColor {
  const epsilon = 0.008856;
  const kappa = 903.3;
  const xr = X / XYZ_REFERENCE_WHITE.X;
  const yr = Y / XYZ_REFERENCE_WHITE.Y;
  const zr = Z / XYZ_REFERENCE_WHITE.Z;
  const fx = xr > epsilon ? Math.pow(xr, 1 / 3) : (kappa * xr + 16) / 116;
  const fy = yr > epsilon ? Math.pow(yr, 1 / 3) : (kappa * yr + 16) / 116;
  const fz = zr > epsilon ? Math.pow(zr, 1 / 3) : (kappa * zr + 16) / 116;
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const xyz = rgbToXYZ(r, g, b);
  return xyzToLab(xyz.X, xyz.Y, xyz.Z);
}

// Lab cache
const beadLabCache: Map<string, LabColor> = new Map();

function getBeadLabColor(bead: BeadColor): LabColor {
  if (!beadLabCache.has(bead.id)) {
    beadLabCache.set(bead.id, rgbToLab(bead.r, bead.g, bead.b));
  }
  return beadLabCache.get(bead.id)!;
}

// CIE94 Delta-E
function deltaECIE94(lab1: LabColor, lab2: LabColor): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const deltaL = L1 - L2;
  const deltaC = C1 - C2;
  const deltaA = a1 - a2;
  const deltaB = b1 - b2;
  const deltaH = Math.sqrt(Math.max(0, deltaA * deltaA + deltaB * deltaB - deltaC * deltaC));
  const SL = 1.0;
  const SC = 1 + 0.045 * C1;
  const SH = 1 + 0.015 * C1;
  return Math.sqrt(
    Math.pow(deltaL / SL, 2) + Math.pow(deltaC / SC, 2) + Math.pow(deltaH / SH, 2)
  );
}

// CIEDE2000 Delta-E
function deltaE2000(lab1: LabColor, lab2: LabColor): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const CBar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(CBar, 7) / (Math.pow(CBar, 7) + Math.pow(25, 7))));
  const a1Prime = a1 * (1 + G);
  const a2Prime = a2 * (1 + G);
  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);
  let h1Prime = Math.atan2(b1, a1Prime) * 180 / Math.PI;
  if (h1Prime < 0) h1Prime += 360;
  let h2Prime = Math.atan2(b2, a2Prime) * 180 / Math.PI;
  if (h2Prime < 0) h2Prime += 360;
  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;
  let deltahPrime: number;
  if (C1Prime * C2Prime === 0) deltahPrime = 0;
  else if (Math.abs(h2Prime - h1Prime) <= 180) deltahPrime = h2Prime - h1Prime;
  else if (h2Prime - h1Prime > 180) deltahPrime = h2Prime - h1Prime - 360;
  else deltahPrime = h2Prime - h1Prime + 360;
  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(deltahPrime * Math.PI / 360);
  const LBarPrime = (L1 + L2) / 2;
  const CBarPrime = (C1Prime + C2Prime) / 2;
  let hBarPrime: number;
  if (C1Prime * C2Prime === 0) hBarPrime = h1Prime + h2Prime;
  else if (Math.abs(h1Prime - h2Prime) <= 180) hBarPrime = (h1Prime + h2Prime) / 2;
  else if (h1Prime + h2Prime < 360) hBarPrime = (h1Prime + h2Prime + 360) / 2;
  else hBarPrime = (h1Prime + h2Prime - 360) / 2;
  const T = 1 - 0.17 * Math.cos((hBarPrime - 30) * Math.PI / 180)
    + 0.24 * Math.cos(2 * hBarPrime * Math.PI / 180)
    + 0.32 * Math.cos((3 * hBarPrime + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hBarPrime - 63) * Math.PI / 180);
  const deltaTheta = 30 * Math.exp(-Math.pow((hBarPrime - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(CBarPrime, 7) / (Math.pow(CBarPrime, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(LBarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LBarPrime - 50, 2));
  const Sc = 1 + 0.045 * CBarPrime;
  const Sh = 1 + 0.015 * CBarPrime * T;
  const Rt = -Math.sin(2 * deltaTheta * Math.PI / 180) * Rc;
  return Math.sqrt(
    Math.pow(deltaLPrime / Sl, 2) +
    Math.pow(deltaCPrime / Sc, 2) +
    Math.pow(deltaHPrime / Sh, 2) +
    Rt * (deltaCPrime / Sc) * (deltaHPrime / Sh)
  );
}

// Euclidean distance
export function findNearestBeadColor(r: number, g: number, b: number): BeadColor {
  let minDistance = Infinity;
  let nearestColor = BEAD_PALETTE[0];
  for (const bead of BEAD_PALETTE) {
    const distance = Math.sqrt(Math.pow(r - bead.r, 2) + Math.pow(g - bead.g, 2) + Math.pow(b - bead.b, 2));
    if (distance < minDistance) { minDistance = distance; nearestColor = bead; }
  }
  return nearestColor;
}

// Weighted Euclidean
export function findNearestBeadColorWeighted(r: number, g: number, b: number): BeadColor {
  let minDistance = Infinity;
  let nearestColor = BEAD_PALETTE[0];
  const wR = 0.299, wG = 0.587, wB = 0.114;
  for (const bead of BEAD_PALETTE) {
    const distance = Math.sqrt(wR * Math.pow(r - bead.r, 2) + wG * Math.pow(g - bead.g, 2) + wB * Math.pow(b - bead.b, 2));
    if (distance < minDistance) { minDistance = distance; nearestColor = bead; }
  }
  return nearestColor;
}

// CIE94
export function findNearestBeadColorCIE94(r: number, g: number, b: number): BeadColor {
  const targetLab = rgbToLab(r, g, b);
  let minDeltaE = Infinity;
  let nearestColor = BEAD_PALETTE[0];
  for (const bead of BEAD_PALETTE) {
    const deltaE = deltaECIE94(targetLab, getBeadLabColor(bead));
    if (deltaE < minDeltaE) { minDeltaE = deltaE; nearestColor = bead; }
  }
  return nearestColor;
}

// CIEDE2000
export function findNearestBeadColorDeltaE(r: number, g: number, b: number): BeadColor {
  const targetLab = rgbToLab(r, g, b);
  let minDeltaE = Infinity;
  let nearestColor = BEAD_PALETTE[0];
  for (const bead of BEAD_PALETTE) {
    const deltaE = deltaE2000(targetLab, getBeadLabColor(bead));
    if (deltaE < minDeltaE) { minDeltaE = deltaE; nearestColor = bead; }
  }
  return nearestColor;
}

// Replacement color finder
export function findReplacementColor(
  missingColor: BeadColor,
  availableColors: BeadColor[],
  excludedIds: Set<string>
): BeadColor | null {
  const candidates = availableColors.filter(c => !excludedIds.has(c.id));
  if (candidates.length === 0) return null;
  let nearest = candidates[0];
  let minDeltaE = Infinity;
  const targetLab = rgbToLab(missingColor.r, missingColor.g, missingColor.b);
  for (const candidate of candidates) {
    const deltaE = deltaE2000(targetLab, getBeadLabColor(candidate));
    if (deltaE < minDeltaE) { minDeltaE = deltaE; nearest = candidate; }
  }
  return nearest;
}

export function getColorDistance(color1: BeadColor, color2: BeadColor): number {
  const lab1 = rgbToLab(color1.r, color1.g, color1.b);
  const lab2 = rgbToLab(color2.r, color2.g, color2.b);
  return deltaE2000(lab1, lab2);
}

// LUT (Look-Up Table) system
const LUT_SIZE = 64;
const LUT_SCALE = 256 / LUT_SIZE;

let lutCache: (BeadColor | null)[][][] | null = null;
let lutAlgorithm: string | null = null;

function buildLUT(algorithm: 'euclidean' | 'weighted' | 'cie94' | 'ciede2000'): void {
  lutCache = new Array(LUT_SIZE).fill(null).map(() =>
    new Array(LUT_SIZE).fill(null).map(() => new Array(LUT_SIZE).fill(null))
  );
  const findFunc = algorithm === 'cie94' ? findNearestBeadColorCIE94
    : algorithm === 'ciede2000' ? findNearestBeadColorDeltaE
    : algorithm === 'weighted' ? findNearestBeadColorWeighted
    : findNearestBeadColor;
  for (let r = 0; r < LUT_SIZE; r++) {
    for (let g = 0; g < LUT_SIZE; g++) {
      for (let b = 0; b < LUT_SIZE; b++) {
        const realR = Math.round(r * LUT_SCALE + LUT_SCALE / 2);
        const realG = Math.round(g * LUT_SCALE + LUT_SCALE / 2);
        const realB = Math.round(b * LUT_SCALE + LUT_SCALE / 2);
        lutCache[r][g][b] = findFunc(realR, realG, realB);
      }
    }
  }
  lutAlgorithm = algorithm;
}

export async function loadLut(): Promise<(BeadColor | null)[][][] | null> {
  if (lutCache) return lutCache;
  try {
    // Try to load precomputed LUT from public/beadLut.json
    const res = await fetch('/beadLut.json');
    const data: number[] = await res.json();
    const arr = new Uint16Array(data);
    lutCache = [];
    for (let r = 0; r < LUT_SIZE; r++) {
      lutCache[r] = [];
      for (let g = 0; g < LUT_SIZE; g++) {
        lutCache[r][g] = [];
        for (let b = 0; b < LUT_SIZE; b++) {
          const idx = arr[r * LUT_SIZE * LUT_SIZE + g * LUT_SIZE + b];
          lutCache[r][g][b] = BEAD_PALETTE[idx] || null;
        }
      }
    }
    lutAlgorithm = 'ciede2000';
    return lutCache;
  } catch {
    return null;
  }
}

export function findNearestBeadColorFast(
  r: number, g: number, b: number,
  algorithm: 'euclidean' | 'weighted' | 'cie94' | 'ciede2000' = 'cie94'
): BeadColor {
  if (!lutCache || lutAlgorithm !== algorithm) buildLUT(algorithm);
  const lr = Math.min(LUT_SIZE - 1, Math.floor(r / LUT_SCALE));
  const lg = Math.min(LUT_SIZE - 1, Math.floor(g / LUT_SCALE));
  const lb = Math.min(LUT_SIZE - 1, Math.floor(b / LUT_SCALE));
  const lutColor = lutCache![lr][lg][lb];
  if (!lutColor) return findNearestBeadColorCIE94(r, g, b);
  const bucketCenterR = lr * LUT_SCALE + LUT_SCALE / 2;
  const bucketCenterG = lg * LUT_SCALE + LUT_SCALE / 2;
  const bucketCenterB = lb * LUT_SCALE + LUT_SCALE / 2;
  const distanceToCenter = Math.abs(r - bucketCenterR) + Math.abs(g - bucketCenterG) + Math.abs(b - bucketCenterB);
  if (distanceToCenter > LUT_SCALE * 1.5) {
    if (algorithm === 'cie94') return findNearestBeadColorCIE94(r, g, b);
    if (algorithm === 'ciede2000') return findNearestBeadColorDeltaE(r, g, b);
    if (algorithm === 'weighted') return findNearestBeadColorWeighted(r, g, b);
    return findNearestBeadColor(r, g, b);
  }
  return lutColor;
}