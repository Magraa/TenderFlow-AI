/**
 * State -> District -> Town / Local Body Registry
 * Maps states, districts, and their constituent Nagar Palikas, Nagar Parishads, and Municipalities.
 */

export interface TownInfo {
  name: string;
  type?: 'Nagar Parishad' | 'Nagar Palika' | 'Nagar Nigam' | 'Cantonment Board' | 'Town';
  aliases?: string[];
}

export interface DistrictInfo {
  name: string;
  towns: TownInfo[];
}

export interface StateInfo {
  name: string;
  districts: DistrictInfo[];
}

export const STATE_DISTRICT_TOWNS_DATA: StateInfo[] = [
  {
    name: 'Madhya Pradesh',
    districts: [
      {
        name: 'Bhind',
        towns: [
          { name: 'Akoda', type: 'Nagar Parishad', aliases: ['akoda', 'npakoda', 'np.akoda', 'buycon1.np.akoda'] },
          { name: 'Mehgaon', type: 'Nagar Parishad', aliases: ['mehgaon', 'npmehgaon', 'semehgaon'] },
          { name: 'Gohad', type: 'Nagar Palika', aliases: ['gohad', 'npgohad', 'gohadbuyerpe'] },
          { name: 'Bhind', type: 'Nagar Palika', aliases: ['bhind', 'npbhind'] },
          { name: 'Ater', type: 'Nagar Parishad', aliases: ['ater', 'npater'] },
          { name: 'Lahar', type: 'Nagar Palika', aliases: ['lahar', 'nplahar'] },
          { name: 'Daboh', type: 'Nagar Parishad', aliases: ['daboh', 'npdaboh'] },
          { name: 'Mihona', type: 'Nagar Parishad', aliases: ['mihona', 'npmihona'] },
          { name: 'Alampur', type: 'Nagar Parishad', aliases: ['alampur', 'npalampur'] },
          { name: 'Mau', type: 'Nagar Parishad', aliases: ['mau', 'npmau', 'engineermau', 'engineermau123'] },
          { name: 'Roun', type: 'Nagar Parishad', aliases: ['roun', 'nproun'] },
        ],
      },
      {
        name: 'Morena',
        towns: [
          { name: 'Morena', type: 'Nagar Nigam', aliases: ['morena', 'nnmorena', 'mc_morena'] },
          { name: 'Porsa', type: 'Nagar Palika', aliases: ['porsa', 'npporsa', 'buyconporsa', 'buyconporsa1'] },
          { name: 'Ambah', type: 'Nagar Palika', aliases: ['ambah', 'npambah', 'npp_ambah_buyer'] },
          { name: 'Joura', type: 'Nagar Parishad', aliases: ['joura', 'npjoura', 'jaura'] },
          { name: 'Kailaras', type: 'Nagar Parishad', aliases: ['kailaras', 'npkailaras'] },
          { name: 'Sabalgarh', type: 'Nagar Palika', aliases: ['sabalgarh', 'npsabalgarh'] },
          { name: 'Bamnor', type: 'Nagar Parishad', aliases: ['bamnor', 'bammore', 'banmore', 'npbamnor'] },
          { name: 'Jhundpura', type: 'Nagar Parishad', aliases: ['jhundpura', 'npjhundpura'] },
        ],
      },
      {
        name: 'Gwalior',
        towns: [
          { name: 'Gwalior', type: 'Nagar Nigam', aliases: ['gwalior', 'nngwalior', 'gmc'] },
          { name: 'Dabra', type: 'Nagar Palika', aliases: ['dabra', 'npdabra'] },
          { name: 'Bhitarwar', type: 'Nagar Parishad', aliases: ['bhitarwar', 'npbhitarwar'] },
          { name: 'Pichhore', type: 'Nagar Parishad', aliases: ['pichhore', 'nppichhore', 'pichhoregwl'] },
          { name: 'Bilaua', type: 'Nagar Parishad', aliases: ['bilaua', 'npbilaua'] },
          { name: 'Antari', type: 'Nagar Parishad', aliases: ['antari', 'npantari'] },
          { name: 'Mohna', type: 'Nagar Parishad', aliases: ['mohna', 'npmohna'] },
        ],
      },
      {
        name: 'Datia',
        towns: [
          { name: 'Datia', type: 'Nagar Palika', aliases: ['datia', 'npdatia'] },
          { name: 'Seondha', type: 'Nagar Parishad', aliases: ['seondha', 'npseondha', 'seodha'] },
          { name: 'Bhander', type: 'Nagar Parishad', aliases: ['bhander', 'npbhander'] },
          { name: 'Indergarh', type: 'Nagar Parishad', aliases: ['indergarh', 'npindergarh'] },
          { name: 'Badoni', type: 'Nagar Parishad', aliases: ['badoni', 'npbadoni'] },
        ],
      },
      {
        name: 'Sheopur',
        towns: [
          { name: 'Sheopur', type: 'Nagar Palika', aliases: ['sheopur', 'npsheopur'] },
          { name: 'Vijaypur', type: 'Nagar Parishad', aliases: ['vijaypur', 'npvijaypur'] },
          { name: 'Badoda', type: 'Nagar Parishad', aliases: ['badoda', 'npbadoda', 'baroda'] },
        ],
      },
      {
        name: 'Shivpuri',
        towns: [
          { name: 'Shivpuri', type: 'Nagar Palika', aliases: ['shivpuri', 'npshivpuri', 'degm_shivpuri', 'buycon174.epgmp'] },
          { name: 'Karera', type: 'Nagar Parishad', aliases: ['karera', 'npkarera', 'sdoftkarer', 'buycon174.epgmp.mp@gembuyer.in'] },
          { name: 'Kolaras', type: 'Nagar Parishad', aliases: ['kolaras', 'npkolaras'] },
          { name: 'Pohari', type: 'Nagar Parishad', aliases: ['pohari', 'nppohari', 'pao25', 'pao25.uad.mp', 'ykgupta375'] },
          { name: 'Narwar', type: 'Nagar Parishad', aliases: ['narwar', 'npnarwar', 'buyernarwarcollege'] },
          { name: 'Magroni', type: 'Nagar Parishad', aliases: ['magroni', 'magrouni', 'npmagroni', 'buyermagrouni'] },
          { name: 'Khaniyadhana', type: 'Nagar Parishad', aliases: ['khaniyadhana', 'npkhaniyadhana'] },
          { name: 'Pichhore', type: 'Nagar Parishad', aliases: ['pichhore', 'nppichhoresvp'] },
          { name: 'Badarwas', type: 'Nagar Parishad', aliases: ['badarwas', 'bodarwar', 'npbadarwas'] },
          { name: 'Rannod', type: 'Nagar Parishad', aliases: ['rannod', 'nprannod'] },
          { name: 'Bairad', type: 'Nagar Parishad', aliases: ['bairad', 'npbairad'] },
        ],
      },
      {
        name: 'Guna',
        towns: [
          { name: 'Guna', type: 'Nagar Palika', aliases: ['guna', 'npguna', 'gunabuyer'] },
          { name: 'Raghogarh', type: 'Nagar Palika', aliases: ['raghogarh', 'npraghogarh'] },
          { name: 'Aron', type: 'Nagar Parishad', aliases: ['aron', 'nparon'] },
          { name: 'Chachaura-Binaganj', type: 'Nagar Parishad', aliases: ['chachaura', 'binaganj', 'npchachaura'] },
          { name: 'Kumbhraj', type: 'Nagar Parishad', aliases: ['kumbhraj', 'npkumbhraj'] },
          { name: 'Maksudangarh', type: 'Nagar Parishad', aliases: ['maksudangarh', 'npmaksudangarh'] },
        ],
      },
      {
        name: 'Ashoknagar',
        towns: [
          { name: 'Ashoknagar', type: 'Nagar Palika', aliases: ['ashoknagar', 'npashoknagar'] },
          { name: 'Chanderi', type: 'Nagar Palika', aliases: ['chanderi', 'npchanderi'] },
          { name: 'Mungaoli', type: 'Nagar Parishad', aliases: ['mungaoli', 'npmungaoli'] },
          { name: 'Isagarh', type: 'Nagar Parishad', aliases: ['isagarh', 'npisagarh'] },
          { name: 'Piprai', type: 'Nagar Parishad', aliases: ['piprai', 'nppiprai'] },
          { name: 'Shadora', type: 'Nagar Parishad', aliases: ['shadora', 'npshadora'] },
        ],
      },
      {
        name: 'Rajgarh',
        towns: [
          { name: 'Rajgarh', type: 'Nagar Palika', aliases: ['rajgarh', 'nprajgarh'] },
          { name: 'Biaora', type: 'Nagar Palika', aliases: ['biaora', 'npbiaora', 'buycon10.epgmp'] },
          { name: 'Sarangpur', type: 'Nagar Palika', aliases: ['sarangpur', 'npsarangpur', 'buyer1sarangpur'] },
          { name: 'Narsinghgarh', type: 'Nagar Palika', aliases: ['narsinghgarh', 'npnarsinghgarh', 'storenarsing'] },
          { name: 'Khilchipur', type: 'Nagar Parishad', aliases: ['khilchipur', 'npkhilchipur', 'cmokhilchipur'] },
          { name: 'Boda', type: 'Nagar Parishad', aliases: ['boda', 'npboda', 'storeboda'] },
          { name: 'Suthaliya', type: 'Nagar Parishad', aliases: ['suthaliya', 'npsuthaliya', 'buyer43.epgmp'] },
          { name: 'Talen', type: 'Nagar Parishad', aliases: ['talen', 'nptalen', 'kamal9098'] },
          { name: 'Chhapiheda', type: 'Nagar Parishad', aliases: ['chhapiheda', 'npchhapiheda'] },
          { name: 'Jirapur', type: 'Nagar Parishad', aliases: ['jirapur', 'npjirapur'] },
          { name: 'Machalpur', type: 'Nagar Parishad', aliases: ['machalpur', 'npmachalpur'] },
          { name: 'Kurawar', type: 'Nagar Parishad', aliases: ['kurawar', 'npkurawar'] },
          { name: 'Pachore', type: 'Nagar Parishad', aliases: ['pachore', 'nppachore'] },
        ],
      },
      {
        name: 'Dewas',
        towns: [
          { name: 'Dewas', type: 'Nagar Nigam', aliases: ['dewas', 'nndewas'] },
          { name: 'Sonkatch', type: 'Nagar Parishad', aliases: ['sonkatch', 'npsonkatch', 'ddosonkatch', 'ddosonkatch0225'] },
          { name: 'Kannod', type: 'Nagar Parishad', aliases: ['kannod', 'npkannod', 'ddokannod', 'ddokannod0224'] },
          { name: 'Satwas', type: 'Nagar Parishad', aliases: ['satwas', 'npsatwas', 'storesatvas', 'storesatvas2'] },
          { name: 'Khategaon', type: 'Nagar Parishad', aliases: ['khategaon', 'npkhategaon'] },
          { name: 'Bagli', type: 'Nagar Parishad', aliases: ['bagli', 'npbagli'] },
          { name: 'Karnawad', type: 'Nagar Parishad', aliases: ['karnawad', 'npkarnawad', 'cokarnavad'] },
          { name: 'Bhorasa', type: 'Nagar Parishad', aliases: ['bhorasa', 'npbhorasa', 'buyerbhorasa'] },
          { name: 'Loharda', type: 'Nagar Parishad', aliases: ['loharda', 'nploharda'] },
          { name: 'Hatpipliya', type: 'Nagar Parishad', aliases: ['hatpipliya', 'nphatpipliya'] },
          { name: 'Tonk Khurd', type: 'Nagar Parishad', aliases: ['tonkkhurd', 'nptonkkhurd'] },
        ],
      },
      {
        name: 'Sagar',
        towns: [
          { name: 'Sagar', type: 'Nagar Nigam', aliases: ['sagar', 'nnsagar'] },
          { name: 'Khurai', type: 'Nagar Palika', aliases: ['khurai', 'npkhurai', 'buyerkhurai'] },
          { name: 'Bina-Etawa', type: 'Nagar Palika', aliases: ['bina', 'etawa', 'npbina'] },
          { name: 'Deori', type: 'Nagar Palika', aliases: ['deori', 'npdeori'] },
          { name: 'Garhakota', type: 'Nagar Palika', aliases: ['garhakota', 'npgarhakota'] },
          { name: 'Rehli', type: 'Nagar Palika', aliases: ['rehli', 'nprehli'] },
          { name: 'Banda', type: 'Nagar Parishad', aliases: ['banda', 'npbanda', 'buyer82.epgmp'] },
          { name: 'Shahgarh', type: 'Nagar Parishad', aliases: ['shahgarh', 'npshahgarh', 'store_shahgarh'] },
          { name: 'Malthone', type: 'Nagar Parishad', aliases: ['malthone', 'npmalthone', 'buyermalthone'] },
          { name: 'Barodiya Kalan', type: 'Nagar Parishad', aliases: ['barodiya', 'npbarodiya', 'buyerbarodiya'] },
          { name: 'Bandri', type: 'Nagar Parishad', aliases: ['bandri', 'npbandri', 'bstore@123'] },
          { name: 'Rahatgarh', type: 'Nagar Parishad', aliases: ['rahatgarh', 'nprahatgarh'] },
          { name: 'Surkhi', type: 'Nagar Parishad', aliases: ['surkhi', 'npsurkhi'] },
          { name: 'Bilhra', type: 'Nagar Parishad', aliases: ['bilhra', 'npbilhra', 'buyerbilera'] },
        ],
      },
      {
        name: 'Bhopal',
        towns: [
          { name: 'Bhopal', type: 'Nagar Nigam', aliases: ['bhopal', 'nnbhopal', 'bmc'] },
          { name: 'Berasia', type: 'Nagar Palika', aliases: ['berasia', 'npberasia'] },
        ],
      },
      {
        name: 'Indore',
        towns: [
          { name: 'Indore', type: 'Nagar Nigam', aliases: ['indore', 'nnindore', 'imc'] },
          { name: 'Mhow', type: 'Cantonment Board', aliases: ['mhow', 'dr.ambedkarnagar'] },
          { name: 'Sanwer', type: 'Nagar Parishad', aliases: ['sanwer', 'npsanwer', 'cmomilan'] },
          { name: 'Depalpur', type: 'Nagar Parishad', aliases: ['depalpur', 'npdepalpur'] },
          { name: 'Hatod', type: 'Nagar Parishad', aliases: ['hatod', 'nphatod', 'cmohathod'] },
          { name: 'Betma', type: 'Nagar Parishad', aliases: ['betma', 'npbetma'] },
          { name: 'Rau', type: 'Nagar Parishad', aliases: ['rau', 'nprau'] },
          { name: 'Manglaya', type: 'Nagar Parishad', aliases: ['manglaya', 'npmanglaya'] },
        ],
      },
      {
        name: 'Ujjain',
        towns: [
          { name: 'Ujjain', type: 'Nagar Nigam', aliases: ['ujjain', 'nnujjain'] },
          { name: 'Nagda', type: 'Nagar Palika', aliases: ['nagda', 'npnagda'] },
          { name: 'Khachrod', type: 'Nagar Palika', aliases: ['khachrod', 'npkhachrod'] },
          { name: 'Mahidpur', type: 'Nagar Palika', aliases: ['mahidpur', 'npmahidpur'] },
          { name: 'Tarana', type: 'Nagar Parishad', aliases: ['tarana', 'nptarana'] },
          { name: 'Badnagar', type: 'Nagar Palika', aliases: ['badnagar', 'barnagar'] },
          { name: 'Makdone', type: 'Nagar Parishad', aliases: ['makdone', 'npmakdone', 'suresh171184'] },
          { name: 'Unhel', type: 'Nagar Parishad', aliases: ['unhel', 'npunhel'] },
        ],
      },
      {
        name: 'Shajapur',
        towns: [
          { name: 'Shajapur', type: 'Nagar Palika', aliases: ['shajapur', 'npshajapur', 'storekepperpwd'] },
          { name: 'Maksi', type: 'Nagar Parishad', aliases: ['maksi', 'npmaksi', 'buyermaksi'] },
          { name: 'Shujalpur', type: 'Nagar Palika', aliases: ['shujalpur', 'npshujalpur'] },
          { name: 'Kalapipal', type: 'Nagar Parishad', aliases: ['kalapipal', 'npkalapipal'] },
          { name: 'Akodiya', type: 'Nagar Parishad', aliases: ['akodiya', 'npakodiya', 'kapilparmar'] },
          { name: 'Polay Kalan', type: 'Nagar Parishad', aliases: ['polaykalan', 'nppolaykalan'] },
        ],
      },
      {
        name: 'Vidisha',
        towns: [
          { name: 'Vidisha', type: 'Nagar Palika', aliases: ['vidisha', 'npvidisha'] },
          { name: 'Basoda', type: 'Nagar Palika', aliases: ['basoda', 'ganjbasoda', 'npbasoda'] },
          { name: 'Sironj', type: 'Nagar Palika', aliases: ['sironj', 'npsironj'] },
          { name: 'Kurwai', type: 'Nagar Parishad', aliases: ['kurwai', 'npkurwai'] },
          { name: 'Lateri', type: 'Nagar Parishad', aliases: ['lateri', 'nplateri', 'cmolateri'] },
          { name: 'Shamshabad', type: 'Nagar Parishad', aliases: ['shamshabad', 'npshamshabad'] },
          { name: 'Gulabganj', type: 'Nagar Parishad', aliases: ['gulabganj', 'npgulabganj'] },
        ],
      },
      {
        name: 'Raisen',
        towns: [
          { name: 'Raisen', type: 'Nagar Palika', aliases: ['raisen', 'npraisen'] },
          { name: 'Mandideep', type: 'Nagar Palika', aliases: ['mandideep', 'npmandideep', 'swts2019'] },
          { name: 'Bareli', type: 'Nagar Palika', aliases: ['bareli', 'npbareli', 'barelibuyer'] },
          { name: 'Begamganj', type: 'Nagar Palika', aliases: ['begamganj', 'npbegamganj'] },
          { name: 'Gairatganj', type: 'Nagar Parishad', aliases: ['gairatganj', 'npgairatganj'] },
          { name: 'Obedullaganj', type: 'Nagar Parishad', aliases: ['obedullaganj', 'npobedullaganj'] },
          { name: 'Udaipura', type: 'Nagar Parishad', aliases: ['udaipura', 'npudaipura'] },
          { name: 'Badi', type: 'Nagar Parishad', aliases: ['badi', 'npbadi'] },
          { name: 'Sultanpur', type: 'Nagar Parishad', aliases: ['sultanpur', 'npsultanpur'] },
        ],
      },
      {
        name: 'Sehore',
        towns: [
          { name: 'Sehore', type: 'Nagar Palika', aliases: ['sehore', 'npsehore'] },
          { name: 'Ashta', type: 'Nagar Palika', aliases: ['ashta', 'npashta'] },
          { name: 'Ichhawar', type: 'Nagar Parishad', aliases: ['ichhawar', 'npichhawar'] },
          { name: 'Nasrullaganj', type: 'Nagar Parishad', aliases: ['nasrullaganj', 'bherunda', 'buyernasrullaganj'] },
          { name: 'Shahganj', type: 'Nagar Parishad', aliases: ['shahganj', 'npshahganj', 'ajay_buyer123'] },
          { name: 'Budhni', type: 'Nagar Parishad', aliases: ['budhni', 'npbudhni'] },
          { name: 'Rehti', type: 'Nagar Parishad', aliases: ['rehti', 'nprehti'] },
          { name: 'Jawar', type: 'Nagar Parishad', aliases: ['jawar', 'npjawar'] },
        ],
      },
      {
        name: 'Tikamgarh',
        towns: [
          { name: 'Tikamgarh', type: 'Nagar Palika', aliases: ['tikamgarh', 'nptikamgarh'] },
          { name: 'Jatara', type: 'Nagar Parishad', aliases: ['jatara', 'npjatara', 'accountantjatara'] },
          { name: 'Baldeogarh', type: 'Nagar Parishad', aliases: ['baldeogarh', 'npbaldeogarh'] },
          { name: 'Khargapur', type: 'Nagar Parishad', aliases: ['khargapur', 'npkhargapur'] },
          { name: 'Palera', type: 'Nagar Parishad', aliases: ['palera', 'nppalera'] },
          { name: 'Badagaon', type: 'Nagar Parishad', aliases: ['badagaon', 'npbadagaon'] },
          { name: 'Kari', type: 'Nagar Parishad', aliases: ['kari', 'npkari'] },
        ],
      },
      {
        name: 'Niwari',
        towns: [
          { name: 'Niwari', type: 'Nagar Palika', aliases: ['niwari', 'npniwari'] },
          { name: 'Orchha', type: 'Nagar Parishad', aliases: ['orchha', 'nporchha'] },
          { name: 'Prithvipur', type: 'Nagar Parishad', aliases: ['prithvipur', 'npprithvipur'] },
          { name: 'Tarichar Kalan', type: 'Nagar Parishad', aliases: ['taricharkalan', 'nptarichar'] },
        ],
      },
      {
        name: 'Chhatarpur',
        towns: [
          { name: 'Chhatarpur', type: 'Nagar Palika', aliases: ['chhatarpur', 'npchhatarpur'] },
          { name: 'Nowgong', type: 'Nagar Palika', aliases: ['nowgong', 'npnowgong'] },
          { name: 'Khajuraho', type: 'Nagar Parishad', aliases: ['khajuraho', 'npkhajuraho'] },
          { name: 'Rajnagar', type: 'Nagar Parishad', aliases: ['rajnagar', 'nprajnagar'] },
          { name: 'Harpalpur', type: 'Nagar Parishad', aliases: ['harpalpur', 'npharpalpur'] },
          { name: 'Bakswaha', type: 'Nagar Parishad', aliases: ['bakswaha', 'npbakswaha'] },
          { name: 'Bada Malhera', type: 'Nagar Parishad', aliases: ['badamalhera', 'npbadamalhera'] },
          { name: 'Chandla', type: 'Nagar Parishad', aliases: ['chandla', 'npchandla'] },
          { name: 'Laundi', type: 'Nagar Parishad', aliases: ['laundi', 'nplaundi'] },
          { name: 'Gari Malehra', type: 'Nagar Parishad', aliases: ['garimalehra', 'npgarimalehra'] },
        ],
      },
      {
        name: 'Panna',
        towns: [
          { name: 'Panna', type: 'Nagar Palika', aliases: ['panna', 'nppanna'] },
          { name: 'Ajaigarh', type: 'Nagar Parishad', aliases: ['ajaigarh', 'npajaigarh', 'ajaygarhstore'] },
          { name: 'Devendranagar', type: 'Nagar Parishad', aliases: ['devendranagar', 'npdevendranagar'] },
          { name: 'Amanganj', type: 'Nagar Parishad', aliases: ['amanganj', 'npamanganj'] },
          { name: 'Pawai', type: 'Nagar Parishad', aliases: ['pawai', 'nppawai'] },
          { name: 'Kakreti', type: 'Nagar Parishad', aliases: ['kakreti', 'npkakreti'] },
        ],
      },
      {
        name: 'Satna',
        towns: [
          { name: 'Satna', type: 'Nagar Nigam', aliases: ['satna', 'nnsatna'] },
          { name: 'Maihar', type: 'Nagar Palika', aliases: ['maihar', 'npmaihar'] },
          { name: 'Nagod', type: 'Nagar Parishad', aliases: ['nagod', 'npnagod'] },
          { name: 'Amarpatan', type: 'Nagar Parishad', aliases: ['amarpatan', 'npamarpatan'] },
          { name: 'Unchehara', type: 'Nagar Parishad', aliases: ['unchehara', 'npunchehara', 'buyerunchehara'] },
          { name: 'Ramnagar', type: 'Nagar Parishad', aliases: ['ramnagar', 'npramnagar'] },
          { name: 'Rampur Baghelan', type: 'Nagar Parishad', aliases: ['rampur', 'rampur_baghelan'] },
          { name: 'Kothi', type: 'Nagar Parishad', aliases: ['kothi', 'npkothi'] },
          { name: 'Birsinghpur', type: 'Nagar Parishad', aliases: ['birsinghpur', 'npbirsinghpur'] },
          { name: 'Jaitwara', type: 'Nagar Parishad', aliases: ['jaitwara', 'npjaitwara'] },
          { name: 'Kotar', type: 'Nagar Parishad', aliases: ['kotar', 'npkotar'] },
        ],
      },
      {
        name: 'Rewa',
        towns: [
          { name: 'Rewa', type: 'Nagar Nigam', aliases: ['rewa', 'nnrewa'] },
          { name: 'Teonthar', type: 'Nagar Parishad', aliases: ['teonthar', 'npteonthar'] },
          { name: 'Mangawan', type: 'Nagar Parishad', aliases: ['mangawan', 'npmangawan'] },
          { name: 'Semariya', type: 'Nagar Parishad', aliases: ['semariya', 'npsemariya'] },
          { name: 'Sirmaur', type: 'Nagar Parishad', aliases: ['sirmaur', 'npsirmaur'] },
          { name: 'Govindgarh', type: 'Nagar Parishad', aliases: ['govindgarh', 'npgovindgarh'] },
          { name: 'Gurh', type: 'Nagar Parishad', aliases: ['gurh', 'npgurh'] },
          { name: 'Baikunthpur', type: 'Nagar Parishad', aliases: ['baikunthpur', 'npbaikunthpur'] },
          { name: 'Dabhora', type: 'Nagar Parishad', aliases: ['dabhora', 'npdabhora', 'buycondabhora'] },
          { name: 'Nai Garhi', type: 'Nagar Parishad', aliases: ['naigarhi', 'npnaigarhi'] },
          { name: 'Chakghat', type: 'Nagar Parishad', aliases: ['chakghat', 'npchakghat'] },
        ],
      },
      {
        name: 'Mauganj',
        towns: [
          { name: 'Mauganj', type: 'Nagar Parishad', aliases: ['mauganj', 'npmauganj'] },
          { name: 'Hanumana', type: 'Nagar Parishad', aliases: ['hanumana', 'nphanumana'] },
        ],
      },
      {
        name: 'Sidhi',
        towns: [
          { name: 'Sidhi', type: 'Nagar Palika', aliases: ['sidhi', 'npsidhi'] },
          { name: 'Rampur Naikin', type: 'Nagar Parishad', aliases: ['rampurnaikin', 'nprampurnaikin', 'buyerrampurnekin'] },
          { name: 'Churhat', type: 'Nagar Parishad', aliases: ['churhat', 'npchurhat'] },
          { name: 'Majhauli', type: 'Nagar Parishad', aliases: ['majhauli', 'npmajhauli'] },
        ],
      },
      {
        name: 'Singrauli',
        towns: [
          { name: 'Singrauli', type: 'Nagar Nigam', aliases: ['singrauli', 'nnsingrauli'] },
          { name: 'Sarai', type: 'Nagar Parishad', aliases: ['sarai', 'npsarai', 'buyersarai'] },
          { name: 'Morwa', type: 'Nagar Parishad', aliases: ['morwa', 'npmorwa'] },
          { name: 'Deosar', type: 'Nagar Parishad', aliases: ['deosar', 'npdeosar'] },
        ],
      },
      {
        name: 'Shahdol',
        towns: [
          { name: 'Shahdol', type: 'Nagar Palika', aliases: ['shahdol', 'npshahdol'] },
          { name: 'Burhar', type: 'Nagar Parishad', aliases: ['burhar', 'npburhar', 'burhar_storekeeper'] },
          { name: 'Dhanpuri', type: 'Nagar Palika', aliases: ['dhanpuri', 'npdhanpuri', '41100011'] },
          { name: 'Jaisinghnagar', type: 'Nagar Parishad', aliases: ['jaisinghnagar', 'npjaisinghnagar'] },
          { name: 'Bakho', type: 'Nagar Parishad', aliases: ['bakho', 'npbakho', 'bakhobuyer'] },
          { name: 'Khand', type: 'Nagar Parishad', aliases: ['khand', 'npkhand', 'ramesh@9861'] },
        ],
      },
      {
        name: 'Anuppur',
        towns: [
          { name: 'Anuppur', type: 'Nagar Palika', aliases: ['anuppur', 'npanuppur'] },
          { name: 'Kotma', type: 'Nagar Palika', aliases: ['kotma', 'npkotma', 'id1110'] },
          { name: 'Pasan', type: 'Nagar Palika', aliases: ['pasan', 'nppasan'] },
          { name: 'Bijuri', type: 'Nagar Palika', aliases: ['bijuri', 'npbijuri'] },
          { name: 'Jaithari', type: 'Nagar Parishad', aliases: ['jaithari', 'npjaithari'] },
        ],
      },
      {
        name: 'Umaria',
        towns: [
          { name: 'Umaria', type: 'Nagar Palika', aliases: ['umaria', 'npumaria'] },
          { name: 'Pali', type: 'Nagar Palika', aliases: ['pali', 'nppali', 'birsinghpurpali'] },
          { name: 'Chandia', type: 'Nagar Parishad', aliases: ['chandia', 'npchandia'] },
          { name: 'Nowrozabad', type: 'Nagar Parishad', aliases: ['nowrozabad', 'npnowrozabad'] },
        ],
      },
      {
        name: 'Jabalpur',
        towns: [
          { name: 'Jabalpur', type: 'Nagar Nigam', aliases: ['jabalpur', 'nnjabalpur', 'jmc'] },
          { name: 'Panagar', type: 'Nagar Palika', aliases: ['panagar', 'nppanagar'] },
          { name: 'Sihora', type: 'Nagar Palika', aliases: ['sihora', 'npsihora'] },
          { name: 'Patan', type: 'Nagar Parishad', aliases: ['patan', 'nppatan'] },
          { name: 'Shahpura', type: 'Nagar Parishad', aliases: ['shahpura', 'npshahpura', 'bycon5.np.shahpura'] },
          { name: 'Katangi', type: 'Nagar Parishad', aliases: ['katangi', 'npkatangijbp'] },
          { name: 'Majholi', type: 'Nagar Parishad', aliases: ['majholi', 'npmajholi'] },
          { name: 'Bhedaghat', type: 'Nagar Parishad', aliases: ['bhedaghat', 'npbhedaghat'] },
          { name: 'Barela', type: 'Nagar Parishad', aliases: ['barela', 'npbarela'] },
        ],
      },
      {
        name: 'Katni',
        towns: [
          { name: 'Katni', type: 'Nagar Nigam', aliases: ['katni', 'nnkatni'] },
          { name: 'Vijayraghavgarh', type: 'Nagar Parishad', aliases: ['vijayraghavgarh', 'npvijayraghavgarh', 'buyervgrh'] },
          { name: 'Barhi', type: 'Nagar Parishad', aliases: ['barhi', 'npbarhi'] },
          { name: 'Kymore', type: 'Nagar Parishad', aliases: ['kymore', 'kemore', 'buyerkemore'] },
          { name: 'Bilhari', type: 'Nagar Parishad', aliases: ['bilhari', 'npbilhari'] },
        ],
      },
      {
        name: 'Narsinghpur',
        towns: [
          { name: 'Narsinghpur', type: 'Nagar Palika', aliases: ['narsinghpur', 'npnarsinghpur'] },
          { name: 'Gadarwara', type: 'Nagar Palika', aliases: ['gadarwara', 'npgadarwara'] },
          { name: 'Kareli', type: 'Nagar Palika', aliases: ['kareli', 'npkareli'] },
          { name: 'Gotegaon', type: 'Nagar Palika', aliases: ['gotegaon', 'npgotegaon'] },
          { name: 'Chichli', type: 'Nagar Parishad', aliases: ['chichli', 'npchichli'] },
          { name: 'Salichouka', type: 'Nagar Parishad', aliases: ['salichouka', 'npsalichouka', 'buysalichouka'] },
          { name: 'Tendukheda', type: 'Nagar Parishad', aliases: ['tendukheda', 'nptendukheda', 'buyer.tendukheda'] },
        ],
      },
      {
        name: 'Chhindwara',
        towns: [
          { name: 'Chhindwara', type: 'Nagar Nigam', aliases: ['chhindwara', 'nnchhindwara'] },
          { name: 'Parasia', type: 'Nagar Palika', aliases: ['parasia', 'npparasia'] },
          { name: 'Junnardeo', type: 'Nagar Palika', aliases: ['junnardeo', 'jamai'] },
          { name: 'Sausar', type: 'Nagar Palika', aliases: ['sausar', 'npsausar'] },
          { name: 'Amarwara', type: 'Nagar Palika', aliases: ['amarwara', 'npamarwara'] },
          { name: 'Chandameta Butaria', type: 'Nagar Parishad', aliases: ['chandameta', 'butaria', 'arunp3620'] },
          { name: 'Dongar Parasia', type: 'Nagar Parishad', aliases: ['dongarparasia'] },
          { name: 'Lodhikheda', type: 'Nagar Parishad', aliases: ['lodhikheda', 'nplodhikheda'] },
          { name: 'Mohgaon', type: 'Nagar Parishad', aliases: ['mohgaon', 'npmohgaon'] },
          { name: 'Harrai', type: 'Nagar Parishad', aliases: ['harrai', 'npharrai'] },
          { name: 'Newton Chikhli', type: 'Nagar Parishad', aliases: ['newtonchikhli', 'newtonchikhli8'] },
        ],
      },
      {
        name: 'Pandhurna',
        towns: [
          { name: 'Pandhurna', type: 'Nagar Palika', aliases: ['pandhurna', 'nppandhurna'] },
        ],
      },
      {
        name: 'Balaghat',
        towns: [
          { name: 'Balaghat', type: 'Nagar Palika', aliases: ['balaghat', 'npbalaghat'] },
          { name: 'Waraseoni', type: 'Nagar Palika', aliases: ['waraseoni', 'npwaraseoni'] },
          { name: 'Baihar', type: 'Nagar Parishad', aliases: ['baihar', 'npbaihar'] },
          { name: 'Katangi', type: 'Nagar Parishad', aliases: ['katangi', 'npkatangi', 'storekatangi'] },
          { name: 'Malanjkhand', type: 'Nagar Palika', aliases: ['malanjkhand', 'npmalanjkhand'] },
          { name: 'Lalburra', type: 'Nagar Parishad', aliases: ['lalburra', 'nplalburra'] },
          { name: 'Lanji', type: 'Nagar Parishad', aliases: ['lanji', 'nplanji'] },
          { name: 'Tirodi', type: 'Nagar Parishad', aliases: ['tirodi', 'nptirodi'] },
        ],
      },
      {
        name: 'Mandla',
        towns: [
          { name: 'Mandla', type: 'Nagar Palika', aliases: ['mandla', 'npmandla'] },
          { name: 'Nainpur', type: 'Nagar Palika', aliases: ['nainpur', 'npnainpur'] },
          { name: 'Bamhani Banjar', type: 'Nagar Parishad', aliases: ['bamhani', 'bamhanibanjar', 'qureshi12345'] },
          { name: 'Bichhiya', type: 'Nagar Parishad', aliases: ['bichhiya', 'npbichhiya'] },
        ],
      },
      {
        name: 'Dindori',
        towns: [
          { name: 'Dindori', type: 'Nagar Parishad', aliases: ['dindori', 'npdindori'] },
          { name: 'Shahpura', type: 'Nagar Parishad', aliases: ['shahpura', 'npshahpuradin'] },
        ],
      },
      {
        name: 'Seoni',
        towns: [
          { name: 'Seoni', type: 'Nagar Palika', aliases: ['seoni', 'npseoni'] },
          { name: 'Barghat', type: 'Nagar Parishad', aliases: ['barghat', 'npbarghat'] },
          { name: 'Lakhnadon', type: 'Nagar Parishad', aliases: ['lakhnadon', 'nplakhnadon'] },
          { name: 'Ghansore', type: 'Nagar Parishad', aliases: ['ghansore', 'npghansore'] },
          { name: 'Keolari', type: 'Nagar Parishad', aliases: ['keolari', 'npkeolari'] },
        ],
      },
      {
        name: 'Betul',
        towns: [
          { name: 'Betul', type: 'Nagar Palika', aliases: ['betul', 'npbetul'] },
          { name: 'Amla', type: 'Nagar Palika', aliases: ['amla', 'npamla', 'gopal_pawar'] },
          { name: 'Sarni', type: 'Nagar Palika', aliases: ['sarni', 'npsarni'] },
          { name: 'Multai', type: 'Nagar Palika', aliases: ['multai', 'npmultai'] },
          { name: 'Athner', type: 'Nagar Parishad', aliases: ['athner', 'npathner', 'cmoath'] },
          { name: 'Bhainsdehi', type: 'Nagar Parishad', aliases: ['bhainsdehi', 'npbhainsdehi'] },
          { name: 'Chicholi', type: 'Nagar Parishad', aliases: ['chicholi', 'npchicholi'] },
          { name: 'Betul Bazar', type: 'Nagar Parishad', aliases: ['betulbazar', 'npbetulbazar'] },
          { name: 'Shahpur', type: 'Nagar Parishad', aliases: ['shahpur', 'npshahpurbetul'] },
        ],
      },
      {
        name: 'Narmadapuram',
        towns: [
          { name: 'Narmadapuram', type: 'Nagar Palika', aliases: ['narmadapuram', 'hoshangabad', 'nphoshangabad'] },
          { name: 'Itarsi', type: 'Nagar Palika', aliases: ['itarsi', 'npitarsi'] },
          { name: 'Pipariya', type: 'Nagar Palika', aliases: ['pipariya', 'nppipariya'] },
          { name: 'Seoni Malwa', type: 'Nagar Palika', aliases: ['seonimalwa', 'npseonimalwa'] },
          { name: 'Babai', type: 'Nagar Parishad', aliases: ['babai', 'makhan_nagar'] },
          { name: 'Sohagpur', type: 'Nagar Parishad', aliases: ['sohagpur', 'npsohagpur'] },
          { name: 'Pachmarhi', type: 'Cantonment Board', aliases: ['pachmarhi'] },
        ],
      },
      {
        name: 'Harda',
        towns: [
          { name: 'Harda', type: 'Nagar Palika', aliases: ['harda', 'npharda'] },
          { name: 'Timarni', type: 'Nagar Parishad', aliases: ['timarni', 'nptimarni'] },
          { name: 'Khirkiya', type: 'Nagar Parishad', aliases: ['khirkiya', 'npkhirkiya'] },
          { name: 'Sirali', type: 'Nagar Parishad', aliases: ['sirali', 'npsirali'] },
        ],
      },
      {
        name: 'Dhar',
        towns: [
          { name: 'Dhar', type: 'Nagar Palika', aliases: ['dhar', 'npdhar', 'buyerdhar', 'buyerdhar123'] },
          { name: 'Pithampur', type: 'Nagar Palika', aliases: ['pithampur', 'nppithampur'] },
          { name: 'Manawar', type: 'Nagar Palika', aliases: ['manawar', 'npmanawar'] },
          { name: 'Badnawar', type: 'Nagar Palika', aliases: ['badnawar', 'npbadnawar'] },
          { name: 'Kukshi', type: 'Nagar Parishad', aliases: ['kukshi', 'npkukshi'] },
          { name: 'Sardarpur', type: 'Nagar Parishad', aliases: ['sardarpur', 'npsardarpur'] },
          { name: 'Rajgarh', type: 'Nagar Parishad', aliases: ['rajgarh', 'rajgarhdhar'] },
          { name: 'Dharampuri', type: 'Nagar Parishad', aliases: ['dharampuri', 'npdharampuri', 'buyer1dharampuri'] },
          { name: 'Mandu', type: 'Nagar Parishad', aliases: ['mandu', 'npmandu'] },
          { name: 'Dhamnod', type: 'Nagar Parishad', aliases: ['dhamnod', 'npdhamnod'] },
          { name: 'Dahi', type: 'Nagar Parishad', aliases: ['dahi', 'npdahi'] },
        ],
      },
      {
        name: 'Khargone',
        towns: [
          { name: 'Khargone', type: 'Nagar Palika', aliases: ['khargone', 'npkhargone', 'nilesh123'] },
          { name: 'Barwaha', type: 'Nagar Palika', aliases: ['barwaha', 'npbarwaha'] },
          { name: 'Sanawad', type: 'Nagar Palika', aliases: ['sanawad', 'npsanawad'] },
          { name: 'Kasrawad', type: 'Nagar Parishad', aliases: ['kasrawad', 'npkasrawad'] },
          { name: 'Maheshwar', type: 'Nagar Parishad', aliases: ['maheshwar', 'npmaheshwar'] },
          { name: 'Mandleshwar', type: 'Nagar Parishad', aliases: ['mandleshwar', 'npmandleshwar'] },
          { name: 'Bhikangaon', type: 'Nagar Parishad', aliases: ['bhikangaon', 'npbhikangaon'] },
          { name: 'Bistan', type: 'Nagar Parishad', aliases: ['bistan', 'npbistan'] },
          { name: 'Karahi', type: 'Nagar Parishad', aliases: ['karahi', 'npkarahi'] },
        ],
      },
      {
        name: 'Khandwa',
        towns: [
          { name: 'Khandwa', type: 'Nagar Nigam', aliases: ['khandwa', 'nnkhandwa'] },
          { name: 'Pandhana', type: 'Nagar Parishad', aliases: ['pandhana', 'nppandhana'] },
          { name: 'Mundi', type: 'Nagar Parishad', aliases: ['mundi', 'npmundi'] },
          { name: 'Harsud', type: 'Nagar Parishad', aliases: ['harsud', 'npharsud'] },
          { name: 'Punasa', type: 'Nagar Parishad', aliases: ['punasa', 'nppunasa', 'cmopunasa', 'cmopunasa2'] },
          { name: 'Chhanera', type: 'Nagar Parishad', aliases: ['chhanera', 'npchhanera'] },
          { name: 'Omkareshwar', type: 'Nagar Parishad', aliases: ['omkareshwar', 'npomkareshwar'] },
        ],
      },
      {
        name: 'Burhanpur',
        towns: [
          { name: 'Burhanpur', type: 'Nagar Nigam', aliases: ['burhanpur', 'nnburhanpur'] },
          { name: 'Shahpur', type: 'Nagar Parishad', aliases: ['shahpur', 'npshahpurbur'] },
        ],
      },
      {
        name: 'Barwani',
        towns: [
          { name: 'Barwani', type: 'Nagar Palika', aliases: ['barwani', 'npbarwani'] },
          { name: 'Sendhwa', type: 'Nagar Palika', aliases: ['sendhwa', 'npsendhwa'] },
          { name: 'Anjad', type: 'Nagar Parishad', aliases: ['anjad', 'npanjad'] },
          { name: 'Khetia', type: 'Nagar Parishad', aliases: ['khetia', 'npkhetia'] },
          { name: 'Palsud', type: 'Nagar Parishad', aliases: ['palsud', 'nppalsud'] },
          { name: 'Rajpur', type: 'Nagar Parishad', aliases: ['rajpur', 'nprajpur'] },
          { name: 'Pansemal', type: 'Nagar Parishad', aliases: ['pansemal', 'nppansemal', 'buyer15'] },
          { name: 'Niwali', type: 'Nagar Parishad', aliases: ['niwali', 'npniwali', 'buyerniw'] },
        ],
      },
      {
        name: 'Jhabua',
        towns: [
          { name: 'Jhabua', type: 'Nagar Palika', aliases: ['jhabua', 'npjhabua'] },
          { name: 'Petlawad', type: 'Nagar Parishad', aliases: ['petlawad', 'nppetlawad', 'cmopetlawad'] },
          { name: 'Thandla', type: 'Nagar Parishad', aliases: ['thandla', 'npthandla', 'cmo_buyer'] },
          { name: 'Meghnagar', type: 'Nagar Parishad', aliases: ['meghnagar', 'npmeghnagar'] },
          { name: 'Ranapur', type: 'Nagar Parishad', aliases: ['ranapur', 'npranapur'] },
        ],
      },
      {
        name: 'Alirajpur',
        towns: [
          { name: 'Alirajpur', type: 'Nagar Palika', aliases: ['alirajpur', 'npalirajpur'] },
          { name: 'Bhabra', type: 'Nagar Parishad', aliases: ['bhabra', 'azadnagar', 'chandrashekharazadnagar'] },
          { name: 'Jobat', type: 'Nagar Parishad', aliases: ['jobat', 'npjobat'] },
        ],
      },
      {
        name: 'Ratlam',
        towns: [
          { name: 'Ratlam', type: 'Nagar Nigam', aliases: ['ratlam', 'nnratlam'] },
          { name: 'Jaora', type: 'Nagar Palika', aliases: ['jaora', 'npjaora'] },
          { name: 'Alot', type: 'Nagar Parishad', aliases: ['alot', 'npalot'] },
          { name: 'Tal', type: 'Nagar Parishad', aliases: ['tal', 'nptal'] },
          { name: 'Sailana', type: 'Nagar Parishad', aliases: ['sailana', 'npsailana'] },
          { name: 'Piploda', type: 'Nagar Parishad', aliases: ['piploda', 'nppiploda'] },
          { name: 'Namli', type: 'Nagar Parishad', aliases: ['namli', 'npnamli'] },
        ],
      },
      {
        name: 'Mandsaur',
        towns: [
          { name: 'Mandsaur', type: 'Nagar Palika', aliases: ['mandsaur', 'npmandsaur'] },
          { name: 'Malhargarh', type: 'Nagar Parishad', aliases: ['malhargarh', 'npmalhargarh'] },
          { name: 'Narayangarh', type: 'Nagar Parishad', aliases: ['narayangarh', 'npnarayangarh'] },
          { name: 'Piplya Mandi', type: 'Nagar Parishad', aliases: ['piplyamandi', 'nppiplyamandi'] },
          { name: 'Sitamau', type: 'Nagar Parishad', aliases: ['sitamau', 'npsitamau'] },
          { name: 'Suwasra', type: 'Nagar Parishad', aliases: ['suwasra', 'npsuwasra'] },
          { name: 'Bhanpura', type: 'Nagar Parishad', aliases: ['bhanpura', 'npbhanpura'] },
          { name: 'Garoth', type: 'Nagar Parishad', aliases: ['garoth', 'npgaroth'] },
          { name: 'Nagri', type: 'Nagar Parishad', aliases: ['nagri', 'npnagri'] },
        ],
      },
      {
        name: 'Neemuch',
        towns: [
          { name: 'Neemuch', type: 'Nagar Palika', aliases: ['neemuch', 'npneemuch'] },
          { name: 'Manasa', type: 'Nagar Parishad', aliases: ['manasa', 'npmanasa'] },
          { name: 'Jawad', type: 'Nagar Parishad', aliases: ['jawad', 'npjawad'] },
          { name: 'Rampura', type: 'Nagar Parishad', aliases: ['rampura', 'nprampura'] },
          { name: 'Singoli', type: 'Nagar Parishad', aliases: ['singoli', 'npsingoli'] },
          { name: 'Diken', type: 'Nagar Parishad', aliases: ['diken', 'npdiken'] },
          { name: 'Ratangarh', type: 'Nagar Parishad', aliases: ['ratangarh', 'npratangarh'] },
          { name: 'Kukdeshwar', type: 'Nagar Parishad', aliases: ['kukdeshwar', 'npkukdeshwar'] },
          { name: 'Athana', type: 'Nagar Parishad', aliases: ['athana', 'npathana'] },
          { name: 'Sarwania Maharaj', type: 'Nagar Parishad', aliases: ['sarwaniamaharaj'] },
        ],
      },
      {
        name: 'Agar Malwa',
        towns: [
          { name: 'Agar', type: 'Nagar Palika', aliases: ['agar', 'npagar', 'agarmalwa'] },
          { name: 'Susner', type: 'Nagar Parishad', aliases: ['susner', 'npsusner'] },
          { name: 'Badod', type: 'Nagar Parishad', aliases: ['badod', 'npbadod'] },
          { name: 'Nalkheda', type: 'Nagar Parishad', aliases: ['nalkheda', 'npnalkheda'] },
          { name: 'Soyat Kalan', type: 'Nagar Parishad', aliases: ['soyatkalan', 'npsoyat'] },
        ],
      },
      {
        name: 'Damoh',
        towns: [
          { name: 'Damoh', type: 'Nagar Palika', aliases: ['damoh', 'npdamoh'] },
          { name: 'Hatta', type: 'Nagar Palika', aliases: ['hatta', 'nphatta'] },
          { name: 'Hindoria', type: 'Nagar Parishad', aliases: ['hindoria', 'nphindoria'] },
          { name: 'Patharia', type: 'Nagar Parishad', aliases: ['patharia', 'nppatharia'] },
          { name: 'Tendukheda', type: 'Nagar Parishad', aliases: ['tendukheda', 'nptendukhedadamoh'] },
          { name: 'Batiyagarh', type: 'Nagar Parishad', aliases: ['batiyagarh', 'npbatiyagarh'] },
        ],
      },
    ],
  },
  {
    name: 'Uttar Pradesh',
    districts: [
      {
        name: 'Jhansi',
        towns: [
          { name: 'Jhansi', type: 'Nagar Nigam', aliases: ['jhansi', 'nnjhansi'] },
          { name: 'Mauranipur', type: 'Nagar Palika', aliases: ['mauranipur'] },
          { name: 'Babina', type: 'Cantonment Board', aliases: ['babina'] },
          { name: 'Baruasagar', type: 'Nagar Palika', aliases: ['baruasagar'] },
          { name: 'Chirgaon', type: 'Nagar Palika', aliases: ['chirgaon'] },
          { name: 'Samthar', type: 'Nagar Palika', aliases: ['samthar'] },
        ],
      },
      {
        name: 'Agra',
        towns: [
          { name: 'Agra', type: 'Nagar Nigam', aliases: ['agra', 'nnagra'] },
          { name: 'Fatehpur Sikri', type: 'Nagar Palika', aliases: ['fatehpursikri'] },
          { name: 'Achhnera', type: 'Nagar Palika', aliases: ['achhnera'] },
          { name: 'Bah', type: 'Nagar Palika', aliases: ['bah'] },
          { name: 'Shamsabad', type: 'Nagar Palika', aliases: ['shamsabad'] },
        ],
      },
    ],
  },
  {
    name: 'Rajasthan',
    districts: [
      {
        name: 'Dholpur',
        towns: [
          { name: 'Dholpur', type: 'Nagar Parishad', aliases: ['dholpur', 'dhaulpur'] },
          { name: 'Bari', type: 'Nagar Palika', aliases: ['bari'] },
          { name: 'Rajakhera', type: 'Nagar Palika', aliases: ['rajakhera'] },
        ],
      },
      {
        name: 'Jaipur',
        towns: [
          { name: 'Jaipur', type: 'Nagar Nigam', aliases: ['jaipur', 'nnjaipur'] },
          { name: 'Chomu', type: 'Nagar Palika', aliases: ['chomu'] },
          { name: 'Kotputli', type: 'Nagar Palika', aliases: ['kotputli'] },
          { name: 'Shahpura', type: 'Nagar Palika', aliases: ['shahpura'] },
        ],
      },
    ],
  },
];

/**
 * Returns all state names
 */
export function getAllStates(): string[] {
  return STATE_DISTRICT_TOWNS_DATA.map((s) => s.name);
}

/**
 * Returns districts for a given state
 */
export function getDistrictsForState(stateName: string): string[] {
  const state = STATE_DISTRICT_TOWNS_DATA.find(
    (s) => s.name.toLowerCase() === stateName.trim().toLowerCase()
  );
  return state ? state.districts.map((d) => d.name) : [];
}

/**
 * Returns towns for a given state and district
 */
export function getTownsForDistrict(stateName: string, districtName: string): TownInfo[] {
  const state = STATE_DISTRICT_TOWNS_DATA.find(
    (s) => s.name.toLowerCase() === stateName.trim().toLowerCase()
  );
  if (!state) return [];
  const district = state.districts.find(
    (d) => d.name.toLowerCase() === districtName.trim().toLowerCase()
  );
  return district ? district.towns : [];
}

/**
 * Returns all search keywords/aliases for a town or an entire district
 */
export function getSearchTokensForSelection(
  stateName: string,
  districtName: string,
  townName?: string
): { townTokens: string[]; displayLabel: string; townNames: string[] } {
  const towns = getTownsForDistrict(stateName, districtName);

  if (townName && townName !== 'ALL') {
    const target = towns.find((t) => t.name.toLowerCase() === townName.trim().toLowerCase());
    const tokens = new Set<string>();
    if (target) {
      tokens.add(target.name.toLowerCase());
      (target.aliases || []).forEach((a) => tokens.add(a.toLowerCase()));
    } else {
      tokens.add(townName.toLowerCase());
    }
    return {
      townTokens: Array.from(tokens),
      displayLabel: `${townName} (${districtName})`,
      townNames: [townName],
    };
  }

  // All towns in the district
  const tokens = new Set<string>();
  tokens.add(districtName.toLowerCase());
  const allNames: string[] = [];
  towns.forEach((t) => {
    allNames.push(t.name);
    tokens.add(t.name.toLowerCase());
    (t.aliases || []).forEach((a) => tokens.add(a.toLowerCase()));
  });

  return {
    townTokens: Array.from(tokens),
    displayLabel: `All Towns in ${districtName}`,
    townNames: allNames,
  };
}
