from firestore_client import get_client

db = get_client()

topics = [
    {"id": "dec_place_value", "title": "gives the place value and the value of a digit of a given decimal number through ten thousandths.", "prerequisites": []},
    {"id": "dec_read_write", "title": "reads and writes decimal numbers through ten thousandths.", "prerequisites": ["dec_place_value"]},
    {"id": "dec_rounding", "title": "rounds decimal numbers to the nearest hundredth and thousandth.", "prerequisites": ["dec_read_write"]},
    {"id": "dec_compare", "title": "compares and arranges decimal numbers.", "prerequisites": ["dec_rounding"]},
    {"id": "dec_add_sub_visual", "title": "visualizes addition and subtraction of decimals.", "prerequisites": ["dec_compare"]},
    {"id": "dec_add_sub", "title": "adds and subtracts decimal numbers through thousandths without and with regrouping.", "prerequisites": ["dec_add_sub_visual"]},
    {"id": "dec_add_sub_estimate", "title": "estimates the sum or difference of decimal numbers with reasonable results.", "prerequisites": ["dec_add_sub"]},
    {"id": "dec_add_sub_problems", "title": "solves routine or non-routine problems involving addition and subtraction of decimal numbers including money using appropriate problem solving strategies and tools.", "prerequisites": ["dec_add_sub_estimate"]},
    {"id": "dec_add_sub_create", "title": "creates problems (with reasonable answers) involving addition and/or subtraction of decimal numbers including money.", "prerequisites": ["dec_add_sub_problems"]},
    {"id": "dec_mul_visual", "title": "visualizes multiplication of decimal numbers using pictorial models.", "prerequisites": ["dec_add_sub_create"]},
    {"id": "dec_mul_whole", "title": "multiplies decimals up to 2 decimal places by 1- to 2-digit whole numbers.", "prerequisites": ["dec_mul_visual"]},
    {"id": "dec_mul_dec", "title": "multiplies decimals with factors up to 2 decimal places.", "prerequisites": ["dec_mul_whole"]},
    {"id": "dec_mul_estimate", "title": "estimates the products of decimal numbers with reasonable results.", "prerequisites": ["dec_mul_dec"]},
    {"id": "dec_mul_problems", "title": "solves routine and non-routine problems involving multiplication without or with addition or subtraction of decimals and whole numbers including money using appropriate problem solving strategies and tools.", "prerequisites": ["dec_mul_estimate"]},
    {"id": "dec_div_visual", "title": "visualizes division of decimal numbers using pictorial models.", "prerequisites": ["dec_mul_problems"]},
    {"id": "dec_div_dec", "title": "divides decimals with up to 2 decimal places.", "prerequisites": ["dec_div_visual"]},
    {"id": "dec_div_whole", "title": "divides whole numbers with quotients in decimal form.", "prerequisites": ["dec_div_dec"]},
    {"id": "dec_div_estimate", "title": "estimates the quotients of decimal numbers with reasonable results.", "prerequisites": ["dec_div_whole"]},
    {"id": "dec_div_problems", "title": "solves routine and non-routine problems involving division without or with any of the other operations of decimals and whole numbers including money using appropriate problem solving strategies and tools.", "prerequisites": ["dec_div_estimate"]},
    {"id": "dec_div_create", "title": "creates problems (with reasonable answers) involving multiplication and/or division or with any of the other operations of decimals and whole numbers including money.", "prerequisites": ["dec_div_problems"]},
    {"id": "ratio_visual", "title": "visualizes the ratio of 2 given numbers.", "prerequisites": ["dec_div_create"]},
    {"id": "ratio_express", "title": "expresses ratio using either the colon (:) or fraction.", "prerequisites": ["ratio_visual"]},
    {"id": "ratio_equivalent", "title": "identifies and writes equivalent ratios.", "prerequisites": ["ratio_express"]},
    {"id": "ratio_simplify", "title": "expresses ratios in their simplest forms.", "prerequisites": ["ratio_equivalent"]},
    {"id": "ratio_missing", "title": "finds the missing term in a pair of equivalent ratios.", "prerequisites": ["ratio_simplify"]},
    {"id": "proportion_define", "title": "defines and describes a proportion.", "prerequisites": ["ratio_missing"]},
    {"id": "proportion_direct", "title": "recognizes when two quantities are in direct proportion.", "prerequisites": ["proportion_define"]}
]

for t in topics:
    db.collection("topics").document(t["id"]).set({
        "title": t["title"],
        "prerequisites": t["prerequisites"]
    })

print("🔥 Competency topics seeded successfully.")
