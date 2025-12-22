import {Terminal} from 'xterm';
import {useEffect, useRef} from "react";
import 'xterm/css/xterm.css';

import './TerminalComponent.css';
import {createProduct, getCurrentId, getProduct, getProducts, increaseId} from "../core/services/ProductService.ts";
import type {Product} from "../core/types/type.ts";

const TerminalComponent = () => {

    const ANSI = {
        reset: "\x1B[0m",
        bold: "\x1b[1m",
        italic: "\x1b[3m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        brightCyan: "\x1b[36m",
        brightGreen: "\x1b[32m",
    }

    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const xterm = new Terminal({
            cursorBlink: true,
        });

        requestAnimationFrame(() => {
            if (terminalRef.current) {
                terminalRef.current.innerHTML = '';

                xterm.open(terminalRef.current);
                xterm.resize(105, 25);
                xterm.write(`Bem vindo ao Terminal ${ANSI.bold}${ANSI.yellow}Amazonic Products${ANSI.reset}\r\n\n$ `);
            }
        });

        let command = '';

        const onDataListener = xterm.onData(async e => {
            switch (e) {
                case '\r':
                    xterm.write('\r\n');
                    await processCommand(command, xterm);
                    command = '';
                    xterm.write('\r\n$ ');
                    break;
                case '\u007F':
                    if(command.length > 0) {
                        command = command.slice(0, -1);
                        xterm.write('\b \b')
                    }
                    break;
                default:
                        command += e;
                        xterm.write(e);
            }
        })

        const processCommand = async (command: string, term: Terminal) => {
            const cleanCmd = command.trim();
            if (cleanCmd === 'help') {
                term.write('\r\nComandos do Sistema:\r\n\n')
                listCommands(term)
            } else if (cleanCmd === 'clear') {
                term.clear();
            } else if (cleanCmd === 'date') {
                term.write(new Date().toLocaleString());
            } else if (cleanCmd === 'reset') {
                window.location.reload();
            } else if (cleanCmd === 'listar') {
                await listProducts(term)
            } else if (cleanCmd.startsWith('procurar -id')) {
                const fields: string[] = cleanCmd.split(' ')
                const id = fields[fields.length - 1];

                await findProduct(term, id);
            } else if (cleanCmd.startsWith('criar') && cleanCmd.includes('-nome')
                && cleanCmd.includes('-preco') && cleanCmd.includes('-avaliacao')) {

                const values: string[] = getValuesToCreate(cleanCmd);

                console.log(values);

                await processCreateProduct(term, values[0], values[1], values[2])
            } else if (cleanCmd !== '') {
                term.write(`${ANSI.bold}${ANSI.red}Comando não reconhecido: ${cleanCmd}${ANSI.reset}`);
            }
        }

        const listProducts = async (term: Terminal)=> {
            const products = await getProducts()
            const id = "ID", name = "NOME", price = "PREÇO", rating = "NOTA";

            term.write("\r\n+----------------------------------------------------------------------------------------+\r\n")
            term.write(`| ${id.padEnd(5)} | ${name.padEnd(50)} | ${price.padEnd(18)} | ${rating.padEnd(5)}|\r\n`)
            term.write("+----------------------------------------------------------------------------------------+\r\n")

            for (const product of products) {
                let productData = `|${String(product.id).padEnd(6)} | ${product.name.padEnd(50)} | R$ ${product.price.toFixed(2).toString().padEnd(15)} | ${String(product.rating).padEnd(5)}|\r\n`
                term.write(productData);
                productData = ``;
            }

            term.write("+----------------------------------------------------------------------------------------+\r\n")
        }

        const findProduct = async (term: Terminal, id: string) => {
            const parsedId = Number(id)

            if(isNaN(parsedId)) {
                term.write(`${ANSI.bold}${ANSI.red}Erro: o ID = ${id} está com o formato incorreto. Tente novamente fornecendo apenas números${ANSI.reset}`)
                return
            }

            try {
                const product = await getProduct(String(parsedId))

                term.write(`\r\n${ANSI.bold}${ANSI.brightGreen}Produto encontrado!${ANSI.reset}\r\n\n`)
                term.write(`ID: ${product.id}\r\n`)
                term.write(`NOME: ${product.name}\r\n`)
                term.write(`PREÇO: R$ ${product.price.toFixed(2)}\r\n`)
                term.write(`AVALIAÇÃO: ${product.rating}\r\n`)
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Produto não encontrado ou erro de conexão!${ANSI.reset}`);
                console.error(err);
            }

        }

        const processCreateProduct = async (term: Terminal, newName: string, newPrice: string, newRating: string) => {
            const parsedPrice = Number(newPrice)
            const parsedRating = Number(newRating)
            let newId: number = 0

            if (isNaN(parsedPrice) || isNaN(parsedRating)) {
                term.write(`${ANSI.bold}${ANSI.red}Erro: Valor(es) com o formato inválido. Preço e avaliação precisam ser números!${ANSI.reset}`);
                return
            }

            try {
                const response = await getCurrentId();
                newId = ++response[0].nowId;
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Erro ao encontrar id atual. Entre em contato com o administrador do sistema.${ANSI.reset}`);
                console.log(err);
                return
            }

            try {
                const productToCreate: Product = {
                    id: String(newId),
                    name: newName,
                    price: parsedPrice,
                    rating: parsedRating
                }

                const response = await createProduct(productToCreate)

                if (response.status === 200 || response.status === 201) {
                    term.write(`${ANSI.bold}${ANSI.brightGreen}Produto cadastrado com sucesso!${ANSI.reset}`);
                }
            } catch (err) {
                term.write(`${ANSI.bold}${ANSI.red}Erro ao cadastrar produto. Entre em contato com o administrador do sistema.${ANSI.reset}`);
                console.log(err);
            }

            try {
                await increaseId(newId)
            } catch (error) {
                term.write(`\r\n${ANSI.bold}${ANSI.red}ATENÇÃO! Erro ao incrementar ID. Entre em contato com o administrador imediatamente!${ANSI.reset}`)
                console.log(error);
            }
        }

        const getValuesToCreate = (command: string) => {
            const values: string[] = []
            const fields: string[] = command.split(' ')
            let name = "", currentIndex = 2

            for(let i = 2; fields[i] !== '-preco'; i++) {
                name += `${fields[i]} `;
                currentIndex++
            }

            values[0] = name.slice(0, -1);
            currentIndex++
            values[1] = fields[currentIndex];
            currentIndex += 2
            values[2] = fields[currentIndex];

            return values;
        }

        const listCommands = (term: Terminal) => {
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"help".padEnd(9)}${ANSI.reset}`)
            term.write(" Mostra os comandos do sistema\r\n")

            //Comando clear
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"clear".padEnd(9)}${ANSI.reset}`)
            term.write(" Limpa o terminal de comando\r\n")

            //Comando date
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"date".padEnd(9)}${ANSI.reset}`)
            term.write(" Mostra a data e hora atual\r\n")

            //Comando reset
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"reset".padEnd(9)}${ANSI.reset}`)
            term.write(" Recarrega a página, recarregando automaticamente o terminal\r\n")

            //Comando listar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"listar".padEnd(9)}${ANSI.reset}`)
            term.write(" Lista os produtos cadastrados\r\n")

            //Comando procurar
            term.write(`${ANSI.bold}${ANSI.brightCyan}${"procurar".padEnd(9)}${ANSI.reset}`)
            term.write(" Mostra um produto específico pelo ID fornecido\r\n")

            term.write(`${ANSI.bold}${ANSI.brightGreen}${"-id".padStart(12).padEnd(13)}${ANSI.reset}`)
            term.write(` Indica o ID do produto à ser procurado. ${ANSI.yellow}Exemplo: procurar -id 1${ANSI.reset}\r\n`)
        }

        return () => {
            onDataListener.dispose()
            xterm.dispose();
        };
    }, [])

    return (
        <>
            <section className="terminal-container">
                <h1>Terminal Administrativo de Produtos</h1>

                <div id={'terminal'} ref={terminalRef}></div>
            </section>
        </>
    );
};

export default TerminalComponent;