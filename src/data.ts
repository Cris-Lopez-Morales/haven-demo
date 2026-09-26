import type { Property } from './types.js';

// Entirely fictional fixtures, not MLS records or current market estimates.
// All addresses, neighborhood labels, prices, rents, and costs are invented.
// Append-only IDs keep v1 saved homes, notes, and scenarios compatible.
// Optional photos are illustrative and do not depict the invented addresses.
const fixtureRows: [string, string, string, string, string, number, number, number, number, Property['type'], number, number, number, number, number, number][] = [
 ['The Willow House','1428 Willow Lane','Lincoln','NE','Near South',325000,3,2,1840,'Single-family',2800,4800,125,0,1998,0],
 ['Parkside Residence','620 Parkside Avenue','Omaha','NE','Dundee',389000,4,2.5,2240,'Single-family',3150,5400,135,0,2006,1],
 ['The Maple Duplex','218 Maple Court','Kansas City','MO','Brookside',285000,4,2,2100,'Duplex',3100,3600,135,0,1988,2],
 ['Juniper Townhome','46 Juniper Walk','Lincoln','NE','Fallbrook',248000,3,2.5,1620,'Townhouse',2450,3600,100,120,2015,3],
 ['The Cedar Loft','85 Cedar Street, Unit 4','Denver','CO','Baker',415000,2,2,1280,'Condo',3000,2900,75,320,2018,4],
 ['Prairie House','317 Meadow Drive','Omaha','NE','Aksarben',269000,3,2,1560,'Single-family',2600,3900,110,0,1974,5],
 ['The Linden Home','908 Linden Way','Lincoln','NE','Country Club',359000,4,3,2360,'Single-family',3250,5100,145,0,2002,6],
 ['Elm Street Duplex','724 Elm Terrace','Omaha','NE','Benson',239000,4,2,1920,'Duplex',2850,3200,130,0,1965,7],
 ['The Terrace','12 Terrace Place, Unit 3','Kansas City','MO','West Plaza',198000,2,1,980,'Condo',1850,2400,65,220,2009,8],
 ['Aspen Retreat','438 Aspen Lane','Denver','CO','Sloan Lake',575000,3,2.5,2140,'Single-family',3700,4100,165,0,2011,9],
 ['The Oak Townhome','173 Oak Row','Kansas City','MO','Waldo',225000,2,2,1360,'Townhouse',2200,2700,90,85,2017,10],
 ['Birchwood Residence','206 Birchwood Court','Lincoln','NE','Highlands',295000,3,2,1780,'Single-family',2750,4300,120,0,1993,11],
 ["The Wren Flat","126 Wren Street, Unit 2","Chicago","IL","North Grove",318000,2,2,1210,"Condo",2650,4800,85,285,2012,12],
 ["Hawthorne Row","842 Hawthorne Row","Chicago","IL","West Gardens",465000,3,2.5,1920,"Townhouse",3400,6700,120,140,2018,13],
 ["The Courtyard Two","317 Courtyard Avenue","Chicago","IL","Maple Square",549000,6,4,3040,"Duplex",4800,7600,175,0,1996,14],
 ["The Northlight Home","419 Northlight Lane","Minneapolis","MN","Cedar Park",345000,3,2,1760,"Single-family",2850,4200,130,0,2001,15],
 ["Lakeglass Loft","62 Lakeglass Way, Unit 8","Minneapolis","MN","Lakeside Quarter",265000,2,1.5,1090,"Condo",2200,3100,70,250,2016,16],
 ["Twin Pines Duplex","713 Twin Pines Drive","Minneapolis","MN","Pine Terrace",389000,4,3,2360,"Duplex",3600,4800,155,0,1989,17],
 ["The Clover Cottage","284 Clover Court","Des Moines","IA","Meadow Park",219000,2,1,1120,"Single-family",2050,2900,100,0,1978,18],
 ["Fieldstone Row","51 Fieldstone Walk","Des Moines","IA","West Commons",259000,3,2.5,1580,"Townhouse",2400,3500,100,95,2020,19],
 ["The Orchard Pair","106 Orchard Terrace","Des Moines","IA","Orchard Hill",289000,4,2,2140,"Duplex",3000,3900,135,0,1992,20],
 ["The Fern House","532 Fern Avenue","Madison","WI","Garden District",369000,3,2,1810,"Single-family",2900,4900,125,0,2003,21],
 ["Lakeshore Studio","27 Stillwater Place, Unit 5","Madison","WI","Lake Commons",205000,1,1,760,"Condo",1700,2600,55,190,2019,22],
 ["The Moss Townhome","314 Moss Row","Madison","WI","Woodland West",319000,3,2.5,1700,"Townhouse",2700,4200,105,120,2017,23],
 ["Sunroom House","726 Sunroom Lane","Austin","TX","Juniper Grove",485000,3,2,2020,"Single-family",3500,6500,155,0,2015,24],
 ["The Terra Flat","44 Terra Court, Unit 7","Austin","TX","East Gardens",329000,2,2,1190,"Condo",2650,4500,80,275,2021,25],
 ["Sagebrush Two","218 Sagebrush Trail","Austin","TX","Creekside",529000,4,4,2640,"Duplex",4500,7100,175,0,2008,26],
 ["The Copper House","365 Copper Lane","Dallas","TX","Oak Gardens",379000,3,2,1900,"Single-family",3150,5400,160,0,2009,27],
 ["Magnolia Row","118 Magnolia Walk","Dallas","TX","North Commons",339000,3,2.5,1740,"Townhouse",2850,4900,120,155,2020,28],
 ["The Arbor Pair","901 Arbor Street","Dallas","TX","Arbor Park",419000,4,3,2420,"Duplex",3850,5900,170,0,1997,29],
 ["The Dogwood Home","148 Dogwood Lane","Raleigh","NC","Pine Commons",395000,3,2.5,2040,"Single-family",3000,3600,120,0,2014,30],
 ["Pinehaven Row","63 Pinehaven Walk","Raleigh","NC","Oak Meadow",309000,3,2.5,1620,"Townhouse",2450,2800,95,115,2022,31],
 ["The Lantern Loft","205 Lantern Square, Unit 3","Raleigh","NC","South Gardens",249000,2,2,1120,"Condo",2100,2200,65,230,2018,32],
 ["The Sycamore House","724 Sycamore Way","Charlotte","NC","Briar Commons",359000,3,2,1870,"Single-family",2800,3200,120,0,2006,33],
 ["Briarwood Terrace","92 Briarwood Row","Charlotte","NC","Greenway Park",285000,2,2.5,1460,"Townhouse",2350,2600,90,100,2021,34],
 ["The Greenway Pair","408 Greenway Court","Charlotte","NC","Clover Park",399000,4,3,2380,"Duplex",3650,3700,145,0,1998,35],
 ["The Peachtree Cottage","214 Peachwood Lane","Atlanta","GA","East Orchard",329000,3,2,1620,"Single-family",2750,3700,125,0,1985,36],
 ["Canopy Loft","38 Canopy Street, Unit 6","Atlanta","GA","Canopy Quarter",279000,2,2,1180,"Condo",2350,3100,70,295,2017,37],
 ["The Garden Duplex","603 Garden Walk","Atlanta","GA","Garden Heights",425000,4,3,2480,"Duplex",3850,4700,150,0,2004,38],
 ["The Acorn Home","182 Acorn Terrace","Nashville","TN","Oakridge",415000,3,2,1930,"Single-family",3050,3000,140,0,2010,39],
 ["The Porch House","57 Porchlight Row","Nashville","TN","West Grove",349000,3,2.5,1710,"Townhouse",2700,2500,110,130,2020,40],
 ["Harmony Flats","821 Harmony Way","Nashville","TN","Cedar Commons",495000,4,4,2680,"Duplex",4200,3600,165,0,2013,41],
 ["The Palmetto Home","410 Palmetto Court","Tampa","FL","Palm Gardens",365000,3,2,1780,"Single-family",2950,4200,225,0,2005,42],
 ["Bayglass Apartment","29 Bayglass Place, Unit 9","Tampa","FL","Bay Commons",259000,2,2,1160,"Condo",2300,3000,100,360,2015,43],
 ["The Sandbar Row","168 Sandbar Walk","Tampa","FL","Harbor Grove",319000,3,2.5,1690,"Townhouse",2650,3600,180,160,2021,44],
 ["The Orange Grove","733 Orangeblossom Lane","Orlando","FL","Orange Commons",345000,3,2,1830,"Single-family",2800,3900,200,0,2011,45],
 ["Sunbeam Loft","81 Sunbeam Court, Unit 4","Orlando","FL","West Gardens",239000,2,2,1090,"Condo",2100,2700,90,295,2018,46],
 ["The Citrus Pair","246 Citrus Way","Orlando","FL","Citrus Park",409000,4,3,2360,"Duplex",3700,4700,245,0,2001,47],
 ["The Agave House","528 Agave Trail","Phoenix","AZ","Desert Grove",389000,3,2,1940,"Single-family",2850,2400,125,0,2012,48],
 ["Desertlight Flat","47 Desertlight Way, Unit 2","Phoenix","AZ","Mesa Commons",255000,2,2,1170,"Condo",2050,1600,65,230,2019,49],
 ["The Terracotta Row","304 Terracotta Walk","Phoenix","AZ","Cactus Gardens",315000,3,2.5,1650,"Townhouse",2450,2000,95,120,2021,50],
 ["The Rainwood House","618 Rainwood Lane","Portland","OR","Fern Commons",515000,3,2,1890,"Single-family",3400,5800,125,0,2007,51],
 ["Mosslight Loft","33 Mosslight Street, Unit 5","Portland","OR","North Canopy",335000,2,2,1150,"Condo",2500,3800,65,310,2016,52],
 ["The Evergreen Pair","256 Evergreen Court","Portland","OR","Evergreen Park",625000,4,4,2710,"Duplex",4600,6900,160,0,2002,53],
 ["The Alder House","735 Alderwood Lane","Seattle","WA","Alder Commons",785000,3,2.5,2130,"Single-family",4300,6900,135,0,2014,54],
 ["Cloudline Apartment","64 Cloudline Place, Unit 8","Seattle","WA","North Landing",449000,2,2,1130,"Condo",3050,4000,70,385,2020,55],
 ["The Rainier Row","193 Rainview Walk","Seattle","WA","Cedar Landing",635000,3,2.5,1770,"Townhouse",3750,5600,110,165,2022,56],
 ["The Sol House","428 Solana Court","San Diego","CA","Sunset Gardens",895000,3,2,1970,"Single-family",4650,9400,150,0,2008,57],
 ["Seaglass Flat","56 Seaglass Place, Unit 3","San Diego","CA","Coastal Commons",565000,2,2,1210,"Condo",3350,5900,75,395,2019,58],
 ["The Dune Townhome","312 Dune Walk","San Diego","CA","Dune Gardens",715000,3,2.5,1810,"Townhouse",4050,7500,120,210,2021,59]
];
const photoIds = ['1600585154340-be6161a56a0c','1600596542815-ffad4c1539a9','1570129477492-45c003edd2be','1600047509807-ba8f99d2cdde','1600607687920-4e2a09cf159d','1564013799919-ab600027ffc6'];
const descriptions = [
  'A light-filled home with generous living spaces, a private garden, and room for what comes next. Explore the sample numbers, test your assumptions, and build your own picture of the opportunity.',
  'Thoughtful spaces, a flexible layout, and a welcoming outdoor area. This fictional listing is designed to help you compare purchase costs and rental scenarios side by side.',
  'Two independent living spaces in one property. The sample rent represents the combined monthly rent of both units. Model your own operating costs before drawing any conclusions.'
];
export const seedProperties: Property[] = fixtureRows.map((r, index) => ({
  id: `sample-${index + 1}`, name: r[0], address: r[1], city: r[2], state: r[3], neighborhood: r[4],
  price: r[5], beds: r[6], baths: r[7], sqft: r[8], type: r[9], rent: r[10], taxAnnual: r[11],
  insuranceMonthly: r[12], hoaMonthly: r[13], yearBuilt: r[14], art: r[15],
  photo: `https://images.unsplash.com/photo-${photoIds[index % photoIds.length]}?auto=format&fit=crop&w=900&q=80`,
  tags: r[9] === 'Duplex' ? ['Separate entrances','Two living spaces','Combined rental input'] : r[9] === 'Condo' ? ['Light-filled spaces','Efficient layout','HOA input included'] : r[9] === 'Townhouse' ? ['Private entry','Flexible living','Outdoor terrace'] : index % 2 === 0 ? ['Private garden','Open-plan living','Natural light'] : ['Flexible layout','Outdoor space','Generous storage'],
  description: r[9] === 'Duplex' ? descriptions[2] : r[9] === 'Condo' ? 'A compact, light-filled apartment with thoughtfully arranged living spaces. This fictional listing includes a sample HOA input so you can explore the full cost of ownership, not just the purchase price.' : r[9] === 'Townhouse' ? 'A private entry, flexible rooms, and a little outdoor space to make your own. Use this fictional townhome to compare financing, recurring costs, and rental scenarios with the rest of your shortlist.' : descriptions[index % 2],
  addedAt: fixtureRows.length - index
}));
