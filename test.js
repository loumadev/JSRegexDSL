const {Regex, Capture, ChoiceOf, ZeroOrMore, OneOrMore, Repeat, One, Optionally, $whitespace, $digit} = require("./definitions");

var a = Regex([
    Capture({as: "name"}, [
        ChoiceOf([
            "CREDIT",
            "DEBIT"
        ])
    ]),
    Optionally([
        OneOrMore($whitespace)
    ]),
    Capture([
        Regex([
            Repeat({from: 1, to: 3}, [
                One($digit)
            ]),
            "/",
            Repeat({from: 1, to: 3}, [
                One($digit)
            ]),
            "/",
            Repeat({count: 4}, [
                One($digit)
            ])
        ])
    ])
])
    .returnAllMatches()
    .anchorsMatchLineEndings()
    .ignoresCase();
console.log(a.build());


var _a = Regex(
    Capture({as: "name"},
        ChoiceOf(
            "CREDIT",
            "DEBIT"
        )
    ),
    Optionally(
        OneOrMore($whitespace)
    ),
    Capture(
        Regex(
            Repeat({from: 1, to: 3},
                One($digit)
            ),
            "/",
            Repeat({from: 1, to: 3},
                One($digit)
            ),
            "/",
            Repeat({count: 4},
                One($digit)
            )
        )
    )
)
    .returnAllMatches()
    .anchorsMatchLineEndings()
    .ignoresCase();
console.log(_a.build());



/(\/\/.*?(?:\n|$)|\/\*(?:.|\n|\r)*?\*\/)/;

var b = Regex([
    ChoiceOf([
        Regex([
            "//",
            Capture({as: "single_comment"}, [
                ZeroOrMore({$reluctant: true}, [
                    /./
                ])
            ]),
            ChoiceOf([
                "\n",
                /$/
            ])
        ]),
        Regex([
            "/*",
            Capture({as: "multi_comment"}, [
                ZeroOrMore({$reluctant: true}, [
                    ChoiceOf([
                        /./,
                        "\n",
                        "\r"
                    ])
                ]),
            ]),
            "*/"
        ])
    ])
])
    .returnAllMatches()
    .anchorsMatchLineEndings()
    .ignoresCase();
console.log(b.build());